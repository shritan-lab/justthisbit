"use client";

import { useEffect, useRef, useState } from "react";
import { copyText } from "../create/browser";
import { secondaryButton } from "../create/styles";

/** A Copy button that shows "Copied" for 2 seconds. */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    const ok = await copyText(text);
    setState(ok ? "copied" : "failed");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 2000);
  };

  return (
    <button type="button" onClick={copy} className={`${secondaryButton} shrink-0`} aria-live="polite">
      {state === "copied" ? "Copied" : state === "failed" ? "Couldn't copy" : label}
    </button>
  );
}
