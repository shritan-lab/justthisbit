"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { hasEntryInput, initialPasteInput, MAX_ENTRY_INPUT_LENGTH } from "@/lib/create-entry";
import { parseYouTubeInput } from "@/lib/youtube";
import { useCanReadClipboard } from "./browser";
import { ClipEditor } from "./clip-editor";
import { RecentClips } from "./recent-clips";
import { errorText, fieldLabel, secondaryButton, textField } from "./styles";

export const PASTE_ERROR_MESSAGE =
  "That doesn't look like a YouTube video link. Copy it from the Share button on YouTube and paste it here.";

const PASTE_HELP = "Paste a link from YouTube. If it has a time in it, the clip starts there.";

/** The create page (SPEC 5.2): paste field, then the editor once a video is found. */
export function CreateClip() {
  const params = useSearchParams();
  const [entry] = useState(() => ({ url: params.get("url"), v: params.get("v"), t: params.get("t") }));
  const [input, setInput] = useState(() => initialPasteInput(entry));
  // Opening the keyboard on top of a pre-filled editor would hide it, so only focus an empty page.
  const [autoFocus] = useState(() => !hasEntryInput(entry));
  const [clipboardError, setClipboardError] = useState(false);
  const canPaste = useCanReadClipboard();

  const parsed = useMemo(() => parseYouTubeInput(input), [input]);
  const invalid = input.trim() !== "" && parsed === null;

  const change = (value: string) => {
    setInput(value.slice(0, MAX_ENTRY_INPUT_LENGTH));
    setClipboardError(false);
  };

  const paste = async () => {
    try {
      change(await navigator.clipboard.readText());
    } catch {
      setClipboardError(true);
    }
  };

  const describedBy = invalid ? "paste-error" : clipboardError ? "paste-clipboard-error" : parsed ? undefined : "paste-help";

  return (
    <div className="flex flex-col gap-8">
      <section aria-label="Video" className="flex flex-col gap-2">
        <label htmlFor="paste-input" className={fieldLabel}>
          YouTube link
        </label>
        <div className="flex gap-2">
          <input
            id="paste-input"
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            autoFocus={autoFocus}
            placeholder="https://youtu.be/..."
            value={input}
            onChange={(e) => change(e.target.value)}
            aria-invalid={invalid ? true : undefined}
            aria-describedby={describedBy}
            className={`${textField} flex-1`}
          />
          {canPaste ? (
            <button type="button" onClick={paste} className={`${secondaryButton} shrink-0 rounded-xl px-4`}>
              Paste
            </button>
          ) : null}
        </div>
        {invalid ? (
          <p id="paste-error" role="alert" className={errorText}>
            {PASTE_ERROR_MESSAGE}
          </p>
        ) : clipboardError ? (
          <p id="paste-clipboard-error" role="alert" className={errorText}>
            Couldn&apos;t read the clipboard. Press and hold the box to paste.
          </p>
        ) : parsed ? null : (
          <p id="paste-help" className="text-sm text-muted">
            {PASTE_HELP}
          </p>
        )}
      </section>

      {parsed ? (
        <ClipEditor
          key={`${parsed.videoId}:${parsed.startSeconds ?? 0}`}
          videoId={parsed.videoId}
          initialStart={parsed.startSeconds ?? 0}
        />
      ) : null}

      <RecentClips />
    </div>
  );
}

/** Server-rendered stand-in with the same size, shown until the page hydrates. */
export function CreateClipFallback() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2">
      <p className={fieldLabel}>YouTube link</p>
      <div className="min-h-12 rounded-xl border border-line bg-surface" />
      <p className="text-sm text-muted">{PASTE_HELP}</p>
    </div>
  );
}
