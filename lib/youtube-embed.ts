// Builds the URLs the player needs. Kept free of Zod and other heavy imports
// because the viewer page ships this to the browser.

/**
 * The playerVars from SPEC 5.1. `end` and `autoplay` are left out on purpose:
 * our own polling owns the end of the clip, and the viewer taps YouTube's play button.
 */
export type ClipPlayerVars = {
  start: number;
  playsinline: 1;
  rel: 0;
  enablejsapi: 1;
  origin: string;
};

export function clipPlayerVars(start: number, origin: string): ClipPlayerVars {
  const safeStart = Number.isFinite(start) && start > 0 ? Math.floor(start) : 0;
  return { start: safeStart, playsinline: 1, rel: 0, enablejsapi: 1, origin };
}

/** `https://www.youtube.com/embed/{id}?start=..&playsinline=1&rel=0&enablejsapi=1&origin=..` */
export function youtubeEmbedUrl(videoId: string, vars: ClipPlayerVars): string {
  const url = new URL(`https://www.youtube.com/embed/${encodeURIComponent(videoId)}`);
  for (const [key, value] of Object.entries(vars)) url.searchParams.set(key, String(value));
  return url.toString();
}

/** hqdefault exists for every video, is small, and loads fast in link previews. */
export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}
