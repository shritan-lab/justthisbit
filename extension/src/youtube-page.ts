// Where things are on a youtube.com page. Video ids come from lib/youtube.ts.
// Selectors were checked against the live site in October 2026. If YouTube moves things and
// no spot is found, the button is simply not placed and the toolbar popup still works.

import { parseYouTubeInput } from "../../lib/youtube";

export type PageKind = "watch" | "shorts";

/** watch for /watch and /live/{id}, shorts for /shorts/{id}, null for every other page. */
export function pageKindOf(pathname: string): PageKind | null {
  if (pathname === "/watch" || pathname === "/watch/") return "watch";
  if (/^\/live\/[^/]+\/?$/.test(pathname)) return "watch";
  if (/^\/shorts\/[^/]+\/?$/.test(pathname)) return "shorts";
  return null;
}

/** The video on a watch, live or shorts page, or null on any other page. */
export function videoIdOf(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (pageKindOf(url.pathname) === null) return null;
  return parseYouTubeInput(url.href)?.videoId ?? null;
}

type Spot = {
  /** Where the Clip button goes, next to Like and Share. Tried in order. */
  buttonRow: readonly string[];
  /** The page's main video element. Tried in order. */
  video: readonly string[];
};

export const SPOTS: Record<PageKind, Spot> = {
  watch: {
    buttonRow: ["ytd-watch-metadata #top-level-buttons-computed", "ytd-watch-metadata #actions #menu"],
    video: ["#movie_player video.html5-main-video", "#movie_player video"],
  },
  shorts: {
    buttonRow: ["reel-action-bar-view-model", "ytd-reel-video-renderer[is-active] #actions"],
    video: ["#shorts-player video.html5-main-video", "#shorts-player video"],
  },
};

/** On a watch page the panel goes right below the row holding the channel and the buttons. */
export const WATCH_PANEL_AFTER = ["ytd-watch-metadata #top-row", "ytd-watch-metadata #actions"] as const;

export type Box = { left: number; top: number; right: number; bottom: number };

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** A real, visible box (hidden elements report all zeros). */
export function isVisibleBox(box: Box): boolean {
  return box.right - box.left > 0 && box.bottom - box.top > 0;
}

export const FLOATING_GAP = 16;

/**
 * Where to put the floating panel on a Shorts page, so it never covers the video.
 * Tries the space right of the action bar first, then the space left of the video.
 * Returns null when neither side is wide enough.
 */
export function floatingSpot(input: {
  viewport: { width: number; height: number };
  video: Box;
  actions: Box;
  panel: { width: number; height: number };
}): { left: number; top: number } | null {
  const { viewport, video, actions, panel } = input;
  const top = Math.max(FLOATING_GAP, Math.min(actions.top, viewport.height - panel.height - FLOATING_GAP));

  const rightLeft = Math.max(video.right, actions.right) + FLOATING_GAP;
  if (rightLeft + panel.width <= viewport.width - FLOATING_GAP) return { left: rightLeft, top };

  const leftLeft = Math.min(video.left, actions.left) - FLOATING_GAP - panel.width;
  if (leftLeft >= FLOATING_GAP) return { left: leftLeft, top };

  return null;
}
