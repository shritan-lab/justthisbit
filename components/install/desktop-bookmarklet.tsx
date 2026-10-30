"use client";

import { useEffect, useRef, useState } from "react";
import { CopyButton } from "./copy-button";

/** The draggable "Clip this" bookmarklet from SPEC 6.3. */
export function DesktopBookmarklet({ bookmarklet }: { bookmarklet: string }) {
  const link = useRef<HTMLAnchorElement>(null);
  const [clicked, setClicked] = useState(false);

  // React blocks javascript: URLs in href, so the attribute is set on the element directly.
  useEffect(() => {
    link.current?.setAttribute("href", bookmarklet);
  }, [bookmarklet]);

  return (
    <>
      <p className="text-muted">
        Drag the <b className="text-ink">Clip this</b> button up onto your bookmarks bar (press Ctrl+Shift+B, or
        Cmd+Shift+B on a Mac, if the bar is hidden).
      </p>
      <a
        ref={link}
        data-testid="bookmarklet"
        draggable
        onClick={(e) => {
          // Clicking it here does nothing useful, so show a hint instead.
          e.preventDefault();
          setClicked(true);
        }}
        className="inline-flex min-h-12 cursor-grab items-center gap-2 self-start rounded-full border-2 border-dashed border-accent px-5 text-base font-semibold text-accent active:cursor-grabbing"
      >
        <span aria-hidden="true">▶</span> Clip this
      </a>
      {clicked ? (
        <p role="status" className="text-sm text-muted">
          Drag it to the bookmarks bar instead of clicking it here.
        </p>
      ) : null}
      <p>
        Then open any YouTube video and click <b>Clip this</b>. A new tab opens here with the video ready and the start
        set to where you paused.
      </p>
      <details className="text-sm text-muted">
        <summary className="inline-flex min-h-11 cursor-pointer items-center">Can&apos;t drag it?</summary>
        <div className="flex flex-col gap-2 pt-1">
          <p>Make a new bookmark, name it Clip this, and paste this as its address:</p>
          <textarea
            readOnly
            aria-label="Bookmarklet code"
            data-testid="bookmarklet-code"
            value={bookmarklet}
            rows={3}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-none rounded-xl border border-field bg-canvas p-3 font-mono text-xs text-ink"
          />
          <CopyButton text={bookmarklet} label="Copy the code" />
        </div>
      </details>
    </>
  );
}
