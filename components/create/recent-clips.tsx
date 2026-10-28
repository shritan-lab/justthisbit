"use client";

import { useEffect, useRef, useState } from "react";
import { formatClock } from "@/lib/time";
import { copyText } from "./browser";
import { forgetAllClips, useRecentClips } from "./recent-clips-store";
import { smallButton } from "./styles";

export function RecentClips() {
  const clips = useRecentClips();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  if (clips.length === 0) return null;

  const copy = async (url: string) => {
    const ok = await copyText(url);
    setCopiedUrl(ok ? url : null);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <section aria-labelledby="recent-title" data-testid="recent-clips" className="flex flex-col gap-3 border-t border-line pt-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="recent-title" className="text-lg font-semibold">
          Recent clips
        </h2>
        <button
          type="button"
          onClick={forgetAllClips}
          className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-muted underline underline-offset-4 hover:text-ink"
        >
          Clear all
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {clips.map((clip) => (
          <li
            key={clip.url}
            data-testid="recent-clip"
            className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{clip.note ?? clip.title}</p>
              <p className="truncate text-sm text-muted">
                {formatClock(clip.start)} to {formatClock(clip.end)}
                {clip.note ? <> &middot; {clip.title}</> : null}
              </p>
            </div>
            <button
              type="button"
              onClick={() => copy(clip.url)}
              aria-label={`Copy link: ${clip.note ?? clip.title}, ${formatClock(clip.start)} to ${formatClock(clip.end)}`}
              className={`${smallButton} shrink-0`}
            >
              {copiedUrl === clip.url ? "Copied" : "Copy"}
            </button>
            <a href={clip.url} target="_blank" rel="noopener" className={`${smallButton} shrink-0`}>
              Open
            </a>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">Saved on this device only.</p>
    </section>
  );
}
