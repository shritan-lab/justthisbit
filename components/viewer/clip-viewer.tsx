"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { useClipPlayer } from "@/components/player/use-clip-player";
import { formatClock } from "@/lib/time";

type Props = {
  videoId: string;
  start: number;
  end: number;
  note?: string;
  /** `youtubeWatchUrl(videoId, start)`, built on the server so Zod stays out of the browser bundle. */
  watchUrl: string;
  thumbnailUrl: string;
  /** Source video title and channel. Streams in from the server. */
  source?: ReactNode;
};

const primaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink transition-opacity hover:opacity-90";
const secondaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-line px-6 text-base font-medium text-ink transition-colors hover:border-muted";

export function ClipViewer({ videoId, start, end, note, watchUrl, thumbnailUrl, source }: Props) {
  const { containerRef, status, clipEnded, replay } = useClipPlayer(videoId, start, end);
  const endPanelRef = useRef<HTMLDivElement>(null);
  const failed = status === "error";
  const showEndPanel = clipEnded && !failed;

  useEffect(() => {
    if (!showEndPanel) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    endPanelRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  }, [showEndPanel]);

  const clipLine = `${formatClock(end - start)} clip · starts at ${formatClock(start)}`;

  return (
    <div data-testid="clip-viewer" data-player-status={status} className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        {note ? (
          <>
            <h1 className="whitespace-pre-line break-words text-2xl font-semibold leading-snug sm:text-3xl">{note}</h1>
            <p className="text-base text-muted">{clipLine}</p>
          </>
        ) : (
          <h1 className="text-xl font-semibold text-ink sm:text-2xl">{clipLine}</h1>
        )}
      </header>

      {/* The player box. Nothing is ever placed on top of it. */}
      <div
        data-testid="player-frame"
        className={failed ? "hidden" : "relative aspect-video w-full overflow-hidden rounded-xl bg-surface"}
      >
        <div ref={containerRef} className="absolute inset-0" />
      </div>

      {failed ? <FallbackCard start={start} end={end} watchUrl={watchUrl} thumbnailUrl={thumbnailUrl} /> : null}

      {/* End panel slot: always below the player. */}
      <div ref={endPanelRef} aria-live="polite" className="scroll-mb-4">
        {showEndPanel ? (
          <section
            data-testid="end-panel"
            aria-label="Clip finished"
            className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 sm:p-5"
          >
            <p className="text-lg font-semibold">That&apos;s the bit.</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="button" onClick={replay} className={primaryButton}>
                Replay
              </button>
              <a href={watchUrl} className={secondaryButton}>
                Watch the full video on YouTube
              </a>
              <Link href="/" className={secondaryButton}>
                Make your own clip
              </Link>
            </div>
          </section>
        ) : null}
      </div>

      <footer className="flex flex-col gap-2 border-t border-line pt-4 text-sm text-muted">
        {source}
        <Link href="/" className="inline-flex min-h-11 w-fit items-center text-ink underline underline-offset-4">
          Make your own clip
        </Link>
      </footer>
    </div>
  );
}

function FallbackCard({
  start,
  end,
  watchUrl,
  thumbnailUrl,
}: {
  start: number;
  end: number;
  watchUrl: string;
  thumbnailUrl: string;
}) {
  return (
    <section
      data-testid="fallback-card"
      aria-labelledby="fallback-title"
      className="overflow-hidden rounded-xl border border-line bg-surface"
    >
      {/* A plain img: next/image would route the thumbnail through the paid optimizer for no gain. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumbnailUrl} alt="" width={480} height={360} className="aspect-video w-full object-cover" />
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <h2 id="fallback-title" className="text-xl font-semibold">
          This video can&apos;t play here
        </h2>
        <a href={watchUrl} className={`${primaryButton} w-full text-lg sm:w-auto`}>
          Open on YouTube at {formatClock(start)}
        </a>
        <p className="text-muted">Stop at {formatClock(end)}</p>
      </div>
    </section>
  );
}
