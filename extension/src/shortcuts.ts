export type ShortcutAction = "start" | "end" | "copy";

type KeyLike = {
  altKey: boolean;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  code?: string;
  key?: string;
};

const LETTERS: Record<string, ShortcutAction> = { s: "start", e: "end", c: "copy" };

/**
 * Alt+Shift+S sets the start, Alt+Shift+E sets the end, Alt+Shift+C copies the link.
 * Reads the physical key (`code`) first, because Alt and Shift change `key` on some layouts.
 */
export function matchShortcut(event: KeyLike): ShortcutAction | null {
  if (!event.altKey || !event.shiftKey || event.ctrlKey || event.metaKey) return null;
  const fromCode = /^Key([A-Z])$/.exec(event.code ?? "")?.[1]?.toLowerCase();
  const letter = fromCode ?? (event.key?.length === 1 ? event.key.toLowerCase() : undefined);
  return letter ? (LETTERS[letter] ?? null) : null;
}

type ElementLike = { tagName?: unknown; isContentEditable?: unknown } | null | undefined;

/** True for fields where a person types: inputs, text areas, selects and editable text (comments, search). */
export function isTypingElement(element: ElementLike): boolean {
  if (!element || typeof element !== "object") return false;
  if (element.isContentEditable === true) return true;
  const tag = typeof element.tagName === "string" ? element.tagName.toUpperCase() : "";
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * The element a key press really came from. Events from inside a shadow root (our own panel)
 * reach the window retargeted to the shadow host, so the first entry of composedPath() is used.
 */
export function keyTarget(event: Event): ElementLike {
  const path = typeof event.composedPath === "function" ? event.composedPath() : [];
  return (path[0] ?? event.target) as ElementLike;
}
