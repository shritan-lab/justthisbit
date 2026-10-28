"use client";

import { useEffect, useRef, useState } from "react";
import type { Clip } from "@/lib/clip";
import { shareTitle, whatsappShareUrl } from "@/lib/share";
import { copyText, useCanShare } from "./browser";
import { rememberClip } from "./recent-clips-store";
import { primaryButton, secondaryButton } from "./styles";

type Props = {
  url: string;
  clip: Clip;
  length: number;
  videoTitle?: string;
};

export function ClipOutput({ url, clip, length, videoTitle }: Props) {
  const canShare = useCanShare();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const title = shareTitle(length, videoTitle);

  const remember = () =>
    rememberClip({
      url,
      title: videoTitle ?? "YouTube video",
      start: clip.start,
      end: clip.end,
      ...(clip.note ? { note: clip.note } : {}),
    });

  const share = async () => {
    remember();
    try {
      await navigator.share(clip.note ? { title, text: clip.note, url } : { title, url });
    } catch {
      // Closed the share sheet, or the browser refused. Nothing to do.
    }
  };

  const copy = async () => {
    remember();
    const ok = await copyText(url);
    setCopyState(ok ? "copied" : "failed");
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopyState("idle"), ok ? 2000 : 5000);
  };

  return (
    <section aria-labelledby="output-title" data-testid="clip-output" className="flex flex-col gap-3">
      <h2 id="output-title" className="text-lg font-semibold">
        Your link
      </h2>
      <p
        data-testid="clip-url"
        className="select-all break-all rounded-xl border border-line bg-surface px-4 py-3 font-mono text-sm leading-relaxed text-ink"
      >
        {url}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {canShare ? (
          <button type="button" onClick={share} className={primaryButton}>
            Share
          </button>
        ) : null}
        <a
          href={whatsappShareUrl(url, clip.note)}
          target="_blank"
          rel="noopener"
          onClick={remember}
          className={canShare ? secondaryButton : primaryButton}
        >
          WhatsApp
        </a>
        <button type="button" onClick={copy} className={secondaryButton} aria-live="polite">
          {copyState === "copied" ? "Copied" : "Copy"}
        </button>
        <a href={url} target="_blank" rel="noopener" onClick={remember} className={secondaryButton}>
          Open
        </a>
      </div>
      {copyState === "failed" ? (
        <p role="alert" className="text-sm text-muted">
          Couldn&apos;t copy. Press and hold the link above to copy it.
        </p>
      ) : null}
    </section>
  );
}
