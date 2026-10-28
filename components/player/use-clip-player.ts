"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  POLL_INTERVAL_MS,
  READY_TIMEOUT_MS,
  crossedClipEnd,
  type PlaybackSample,
} from "@/lib/clip-end";
import { clipPlayerVars, youtubeEmbedUrl } from "@/lib/youtube-embed";
import { loadYouTubeIframeApi } from "./youtube-iframe-api";
import { PlayerState, type YTPlayer } from "./youtube-types";

/** Sent with the embed request. YouTube refuses to play (Error 153) without a referrer. */
export const PLAYER_REFERRER_POLICY = "strict-origin-when-cross-origin";

const IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

export type ClipPlayerError =
  /** onError from YouTube: 2, 5, 100, 101, 150, 153 or anything else. */
  | { kind: "player"; code: number }
  /** onReady did not fire within READY_TIMEOUT_MS. */
  | { kind: "timeout" }
  /** The iframe_api script could not load. */
  | { kind: "load_failed" };

export type ClipPlayerStatus = "loading" | "ready" | "error";

export type ClipPlayerOptions = {
  /**
   * "always" (the viewer): pause whenever playback crosses `end` from inside the clip.
   * "preview" (the create page): only after `replay()`, so the sender can play past `end`
   * while looking for the right moment. Disarms once the preview reaches the end.
   */
  endEnforcement?: "always" | "preview";
};

export type ClipPlayer = {
  /** Attach to an empty element. The hook puts the YouTube iframe inside it. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  status: ClipPlayerStatus;
  error: ClipPlayerError | null;
  isPlaying: boolean;
  /** True once playback crossed `end` (or the video ended). The player is paused at that point. */
  clipEnded: boolean;
  /** Seeks to `start` and plays. */
  replay: () => void;
  getCurrentTime: () => number | null;
};

function playbackRate(player: YTPlayer): number {
  try {
    return player.getPlaybackRate?.() ?? 1;
  } catch {
    return 1;
  }
}

/**
 * Owns one YouTube player for a clip: creation, end enforcement, replay, errors and cleanup.
 *
 * - The iframe is created here with `referrerpolicy` set before its `src`, then handed to YT.Player.
 * - While playing, polls every 200ms and pauses when playback crosses `end` from inside the clip.
 *   Seeks outside the clip are left alone.
 * - Any onError code, a failed script load, or no onReady within 10 seconds ends in `status: "error"`.
 *
 * `start` and `end` can change without recreating the player (the create page edits them live).
 * `options.endEnforcement` picks when the end is enforced (see ClipPlayerOptions).
 * A new `videoId` creates a new player.
 */
export function useClipPlayer(
  videoId: string,
  start: number,
  end: number,
  { endEnforcement = "always" }: ClipPlayerOptions = {},
): ClipPlayer {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const lastSampleRef = useRef<PlaybackSample | null>(null);
  const rangeRef = useRef({ start, end });
  const enforcementRef = useRef(endEnforcement);
  // In "preview" mode, true from replay() until the preview reaches the end.
  const previewArmedRef = useRef(false);

  const [status, setStatus] = useState<ClipPlayerStatus>("loading");
  const [error, setError] = useState<ClipPlayerError | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [clipEnded, setClipEnded] = useState(false);

  // Reset when the video changes (React's "adjust state while rendering" pattern).
  const [currentVideoId, setCurrentVideoId] = useState(videoId);
  if (currentVideoId !== videoId) {
    setCurrentVideoId(videoId);
    setStatus("loading");
    setError(null);
    setIsPlaying(false);
    setClipEnded(false);
  }

  useEffect(() => {
    rangeRef.current = { start, end };
  }, [start, end]);

  useEffect(() => {
    enforcementRef.current = endEnforcement;
  }, [endEnforcement]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let failed = false;
    let player: YTPlayer | null = null;
    let poll: number | undefined;

    const sample = (p: YTPlayer): PlaybackSample => ({
      mediaTime: p.getCurrentTime(),
      wallTimeMs: performance.now(),
    });

    const stopPolling = () => {
      if (poll !== undefined) window.clearInterval(poll);
      poll = undefined;
    };

    const tick = () => {
      const p = player;
      if (!p) return;
      const current = sample(p);
      const previous = lastSampleRef.current;
      lastSampleRef.current = current;
      const armed = enforcementRef.current === "always" || previewArmedRef.current;
      if (armed && previous && crossedClipEnd({ previous, current, ...rangeRef.current, playbackRate: playbackRate(p) })) {
        stopPolling();
        lastSampleRef.current = null;
        previewArmedRef.current = false;
        p.pauseVideo();
        setClipEnded(true);
      }
    };

    const startPolling = () => {
      if (poll === undefined) poll = window.setInterval(tick, POLL_INTERVAL_MS);
    };

    const teardown = () => {
      stopPolling();
      window.clearTimeout(readyTimer);
      try {
        player?.destroy();
      } catch {
        // Already gone.
      }
      player = null;
      playerRef.current = null;
      lastSampleRef.current = null;
      container.replaceChildren();
    };

    const fail = (reason: ClipPlayerError) => {
      if (disposed || failed) return;
      failed = true;
      teardown();
      setIsPlaying(false);
      setError(reason);
      setStatus("error");
    };

    const readyTimer = window.setTimeout(() => fail({ kind: "timeout" }), READY_TIMEOUT_MS);

    const onStateChange = (state: number) => {
      const p = player;
      if (!p) return;
      switch (state) {
        case PlayerState.PLAYING: {
          // Seed from where playback (re)starts, so a seek made while paused is never mistaken
          // for playing through `end`.
          const now = sample(p);
          lastSampleRef.current = now;
          if (now.mediaTime < rangeRef.current.end) setClipEnded(false);
          setIsPlaying(true);
          startPolling();
          break;
        }
        case PlayerState.BUFFERING:
          // Keep polling. A seek during playback shows up as a jump and is ignored by the rule.
          break;
        case PlayerState.ENDED:
          // Covers clips whose end is past the end of the video.
          stopPolling();
          lastSampleRef.current = null;
          previewArmedRef.current = false;
          setIsPlaying(false);
          setClipEnded(true);
          break;
        default:
          stopPolling();
          lastSampleRef.current = null;
          setIsPlaying(false);
      }
    };

    loadYouTubeIframeApi().then(
      (YT) => {
        if (disposed || failed) return;

        const iframe = document.createElement("iframe");
        iframe.setAttribute("referrerpolicy", PLAYER_REFERRER_POLICY);
        iframe.setAttribute("allow", IFRAME_ALLOW);
        iframe.setAttribute("allowfullscreen", "");
        iframe.title = "YouTube video player";
        iframe.className = "absolute inset-0 h-full w-full border-0";
        iframe.src = youtubeEmbedUrl(videoId, clipPlayerVars(rangeRef.current.start, window.location.origin));
        container.appendChild(iframe);

        try {
          player = new YT.Player(iframe, {
            events: {
              onReady: () => {
                if (disposed || failed) return;
                window.clearTimeout(readyTimer);
                playerRef.current = player;
                setStatus("ready");
              },
              onStateChange: (event) => onStateChange(event.data),
              onError: (event) => fail({ kind: "player", code: Number(event.data) }),
            },
          });
        } catch {
          fail({ kind: "load_failed" });
        }
      },
      () => fail({ kind: "load_failed" }),
    );

    return () => {
      disposed = true;
      teardown();
    };
  }, [videoId]);

  const replay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    lastSampleRef.current = null;
    previewArmedRef.current = true;
    setClipEnded(false);
    p.seekTo(rangeRef.current.start, true);
    p.playVideo();
  }, []);

  const getCurrentTime = useCallback(() => {
    try {
      return playerRef.current?.getCurrentTime() ?? null;
    } catch {
      return null;
    }
  }, []);

  return { containerRef, status, error, isPlaying, clipEnded, replay, getCurrentTime };
}
