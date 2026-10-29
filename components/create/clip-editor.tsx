"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { useClipPlayer } from "@/components/player/use-clip-player";
import { MAX_NOTE_LENGTH, buildClipUrl, noteLength } from "@/lib/clip";
import { DRAFT_MESSAGES, checkClipDraft, problemPlace } from "@/lib/clip-draft";
import { SITE_URL } from "@/lib/site";
import { formatClock, parseTimeInput } from "@/lib/time";
import { isEmbedBlockedCode, youtubeThumbnailUrl } from "@/lib/youtube-embed";
import { ClipOutput } from "./clip-output";
import { PauseTimeField } from "./pause-time-field";
import { errorText, fieldLabel, primaryButton, smallButton, textField } from "./styles";
import { TimeRow } from "./time-row";
import { useVideoMeta } from "./use-video-meta";

/** Default clip length when only a start is known (SPEC 5.2). */
export const DEFAULT_LENGTH_SECONDS = 30;

const LENGTH_CHIPS = [
  { seconds: 15, label: "+15s" },
  { seconds: 30, label: "+30s" },
  { seconds: 60, label: "+1m" },
  { seconds: 120, label: "+2m" },
] as const;

export const EMBED_BLOCKED_MESSAGE =
  "This video can't play outside YouTube. Your link still works: your friend gets a button that opens YouTube at the right time.";

const PREVIEW_FAILED_MESSAGE =
  "The preview can't load. Check that the video plays on YouTube. You can still make the link.";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}

/** Code points, so an emoji counts as one, the same way the clip page counts. */
function limitNote(value: string): string {
  return noteLength(value) > MAX_NOTE_LENGTH ? Array.from(value).slice(0, MAX_NOTE_LENGTH).join("") : value;
}

type Props = {
  videoId: string;
  initialStart: number;
  /** The shared link had no time, so ask where the sender paused. */
  askPauseTime?: boolean;
};

export function ClipEditor({ videoId, initialStart, askPauseTime = false }: Props) {
  const [startText, setStartText] = useState(() => formatClock(initialStart));
  const [endText, setEndText] = useState(() => formatClock(initialStart + DEFAULT_LENGTH_SECONDS));
  // While set, the end follows the start at this length. Editing the end by hand clears it.
  const [followLength, setFollowLength] = useState<number | null>(DEFAULT_LENGTH_SECONDS);
  const [note, setNote] = useState("");

  const start = parseTimeInput(startText);
  const end = parseTimeInput(endText);
  const draft = checkClipDraft({ videoId, startText, endText, note });
  const place = draft.ok ? null : problemPlace(draft.problem);
  const message = draft.ok ? null : DRAFT_MESSAGES[draft.problem];

  const playerStart = draft.ok ? draft.clip.start : (start ?? initialStart);
  const playerEnd = draft.ok ? draft.clip.end : playerStart + DEFAULT_LENGTH_SECONDS;
  const { containerRef, status, error, replay, cue, getCurrentTime } = useClipPlayer(videoId, playerStart, playerEnd, {
    endEnforcement: "preview",
  });
  const ready = status === "ready";

  // Where the sender said they paused. The player is cued there once typing settles,
  // so "1:05:30" does not cue at 1:00, 1:05 and so on along the way.
  const [pauseCue, setPauseCue] = useState<number | null>(null);
  useEffect(() => {
    if (!ready || pauseCue === null) return;
    const timer = window.setTimeout(() => cue(pauseCue), 300);
    return () => window.clearTimeout(timer);
  }, [ready, pauseCue, cue]);
  const failed = status === "error";
  const embedBlocked = error?.kind === "player" && isEmbedBlockedCode(error.code);

  const meta = useVideoMeta(videoId);

  const changeStart = (text: string) => {
    setStartText(text);
    const value = parseTimeInput(text);
    if (followLength !== null && value !== null) setEndText(formatClock(value + followLength));
  };
  const changeEnd = (text: string) => {
    setEndText(text);
    setFollowLength(null);
  };
  const setStartSeconds = (seconds: number) => changeStart(formatClock(Math.max(0, seconds)));
  const setEndSeconds = (seconds: number) => changeEnd(formatClock(Math.max(0, seconds)));

  // The same result as a link that carried this time: start here, end 30 seconds later.
  const setPauseTime = (seconds: number) => {
    setStartText(formatClock(seconds));
    setEndText(formatClock(seconds + DEFAULT_LENGTH_SECONDS));
    setFollowLength(DEFAULT_LENGTH_SECONDS);
    setPauseCue(seconds);
  };

  const chooseLength = (seconds: number) => {
    if (start === null) return;
    setFollowLength(seconds);
    setEndText(formatClock(start + seconds));
  };

  const playerTime = () => {
    const t = getCurrentTime();
    return t !== null && Number.isFinite(t) && t >= 0 ? t : null;
  };
  // Round the start down and the end up, so the moment the sender picked is inside the clip.
  const startNow = () => {
    const t = playerTime();
    if (t !== null) setStartSeconds(Math.floor(t));
  };
  const endNow = () => {
    const t = playerTime();
    if (t !== null) setEndSeconds(Math.ceil(t));
  };
  const preview = () => {
    if (ready && draft.ok) replay();
  };

  // Desktop shortcuts: I sets the start, O sets the end, P previews. Ignored while typing.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (isTypingTarget(event.target)) return;
    const key = event.key.toLowerCase();
    if (key === "i" && ready) startNow();
    else if (key === "o" && ready) endNow();
    else if (key === "p") preview();
    else return;
    event.preventDefault();
  });
  useEffect(() => {
    const handler = (event: KeyboardEvent) => onKeyDown(event);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const noteCount = noteLength(note);

  return (
    <section
      aria-label="Clip editor"
      data-testid="clip-editor"
      data-player-status={status}
      className="flex flex-col gap-6"
    >
      {askPauseTime ? <PauseTimeField onTime={setPauseTime} /> : null}

      <div className="flex flex-col gap-3">
        {/* The player box. Nothing is ever placed on top of it. */}
        <div
          data-testid="player-frame"
          className={failed ? "hidden" : "relative aspect-video w-full overflow-hidden rounded-xl bg-surface"}
        >
          <div ref={containerRef} className="absolute inset-0" />
        </div>

        {failed ? (
          <div data-testid="player-warning" className="flex flex-col gap-3 sm:flex-row sm:items-start">
            {/* A plain img: next/image would route the thumbnail through the paid optimizer. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={youtubeThumbnailUrl(videoId)}
              alt=""
              width={480}
              height={360}
              className="aspect-video w-full rounded-xl object-cover sm:w-48"
            />
            <p role="status" className="rounded-xl border border-line bg-surface p-4 text-base leading-relaxed">
              {embedBlocked ? EMBED_BLOCKED_MESSAGE : PREVIEW_FAILED_MESSAGE}
            </p>
          </div>
        ) : null}

        {meta ? (
          <p data-testid="video-title" className="break-words text-sm text-muted">
            <span className="text-ink">{meta.title}</span>
            {meta.authorName ? <> &middot; {meta.authorName}</> : null}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <TimeRow
          id="clip-start"
          label="Start"
          text={startText}
          value={start}
          onText={changeStart}
          onBlur={() => start !== null && setStartText(formatClock(start))}
          onNow={startNow}
          nowDisabled={!ready}
          onNudge={(delta) => start !== null && setStartSeconds(start + delta)}
          error={place === "start" ? (message ?? undefined) : undefined}
        />
        <TimeRow
          id="clip-end"
          label="End"
          text={endText}
          value={end}
          onText={changeEnd}
          onBlur={() => end !== null && setEndText(formatClock(end))}
          onNow={endNow}
          nowDisabled={!ready}
          onNudge={(delta) => end !== null && setEndSeconds(end + delta)}
          error={place === "end" ? (message ?? undefined) : undefined}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p id="length-chips-label" className={fieldLabel}>
          Length from the start
        </p>
        <div role="group" aria-labelledby="length-chips-label" className="grid grid-cols-4 gap-2 sm:flex">
          {LENGTH_CHIPS.map((chip) => (
            <button
              key={chip.seconds}
              type="button"
              onClick={() => chooseLength(chip.seconds)}
              disabled={start === null}
              aria-pressed={start !== null && end !== null && end - start === chip.seconds}
              className={`${smallButton} sm:px-5`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-line p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p data-testid="clip-length" aria-live="polite" className="text-2xl font-semibold tabular-nums">
            {draft.ok ? `${formatClock(draft.length)} clip` : "No clip yet"}
          </p>
          <button type="button" onClick={preview} disabled={!ready || !draft.ok} className={primaryButton}>
            Preview
          </button>
        </div>
        {place === "range" ? (
          <p role="alert" className={errorText}>
            {message}
          </p>
        ) : draft.ok ? (
          <p className="text-sm text-muted">
            {formatClock(draft.clip.start)} to {formatClock(draft.clip.end)}
          </p>
        ) : null}
        <p className="hidden text-sm text-muted sm:pointer-fine:block">
          Keys: <kbd className="font-semibold text-ink">I</kbd> sets the start, <kbd className="font-semibold text-ink">O</kbd>{" "}
          sets the end, <kbd className="font-semibold text-ink">P</kbd> previews.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="clip-note" className={fieldLabel}>
            Note (optional)
          </label>
          <span
            id="clip-note-count"
            data-testid="note-count"
            className={`text-sm tabular-nums ${noteCount >= MAX_NOTE_LENGTH ? "text-accent" : "text-muted"}`}
          >
            {noteCount}/{MAX_NOTE_LENGTH}
          </span>
        </div>
        <textarea
          id="clip-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(limitNote(e.target.value))}
          placeholder="Why it's worth watching"
          aria-describedby="clip-note-count"
          className={`${textField} resize-y py-3 leading-snug`}
        />
        {place === "note" ? (
          <p role="alert" className={errorText}>
            {message}
          </p>
        ) : null}
      </div>

      {draft.ok ? (
        <ClipOutput
          url={buildClipUrl(draft.clip, SITE_URL)}
          clip={draft.clip}
          length={draft.length}
          videoTitle={meta?.title}
        />
      ) : null}
    </section>
  );
}
