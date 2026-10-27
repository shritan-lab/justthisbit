// Shared by lib/youtube.ts and lib/clip.ts. Kept separate so those two never import each other in a cycle.
export const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function isValidVideoId(value: unknown): value is string {
  return typeof value === "string" && VIDEO_ID_RE.test(value);
}
