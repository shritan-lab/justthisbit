"use client";

import { useSyncExternalStore } from "react";
import type { StorageLike } from "@/lib/recent-clips";

const noopSubscribe = () => () => {};

/**
 * A browser feature check that is false on the server and during hydration, then real.
 * Avoids hydration mismatches for buttons that only show when the feature exists.
 */
function useBrowserCheck(check: () => boolean): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return check();
      } catch {
        return false;
      }
    },
    () => false,
  );
}

export function useCanShare(): boolean {
  return useBrowserCheck(() => typeof navigator.share === "function");
}

export function useCanReadClipboard(): boolean {
  return useBrowserCheck(() => typeof navigator.clipboard?.readText === "function");
}

/** window.localStorage, or null when the browser blocks it (reading the property can throw). */
export function getLocalStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Copies text with the Clipboard API, falling back to a hidden textarea. Never throws. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Denied or unavailable. Try the old way.
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    textarea.remove();
    return ok;
  } catch {
    return false;
  }
}
