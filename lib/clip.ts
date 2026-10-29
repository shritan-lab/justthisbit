import { z } from "zod";
import { VIDEO_ID_RE } from "./video-id";

export const MIN_CLIP_SECONDS = 1;
export const MAX_CLIP_SECONDS = 3600;
export const MAX_NOTE_LENGTH = 140;

export type Clip = {
  videoId: string;
  start: number;
  end: number;
  note?: string;
};

export type ClipErrorReason = "bad_id" | "bad_range" | "too_long" | "too_short" | "note_too_long";

export type ClipParseResult = { ok: true; clip: Clip } | { ok: false; reason: ClipErrorReason };

/** Raw params as they arrive from the route: path segments plus the `n` search param. */
export type ClipParamsInput = {
  videoId?: unknown;
  range?: unknown;
  n?: unknown;
};

/** Note length in characters as a person counts them (an emoji counts as one). */
export function noteLength(note: string): number {
  return Array.from(note).length;
}

/** Cuts a note being typed down to MAX_NOTE_LENGTH characters, counted the same way as noteLength. */
export function limitNote(note: string): string {
  return noteLength(note) > MAX_NOTE_LENGTH ? Array.from(note).slice(0, MAX_NOTE_LENGTH).join("") : note;
}

function cleanNote(note: string | undefined): string | undefined {
  const trimmed = note?.trim();
  return trimmed ? trimmed : undefined;
}

/** Builds `/c/{videoId}/{start}-{end}` plus `?n={note}` when the trimmed note is not empty. */
export function buildClipPath({ videoId, start, end, note }: Clip): string {
  const base = `/c/${encodeURIComponent(videoId)}/${start}-${end}`;
  const n = cleanNote(note);
  return n ? `${base}?n=${encodeURIComponent(n)}` : base;
}

/**
 * The full link a sender shares: `{siteUrl}/c/{videoId}/{start}-{end}?n={note}`.
 * Pass SITE_URL from lib/site.ts, never `window.location.origin`, so preview deployments
 * and localhost never leak into a shared link.
 */
export function buildClipUrl(clip: Clip, siteUrl: string): string {
  return `${siteUrl.trim().replace(/\/+$/, "")}${buildClipPath(clip)}`;
}

/**
 * True when `url` is an http(s) link to a valid clip page on any host.
 * Used to check links read back from browser storage before they become an href.
 */
export function isClipUrl(url: unknown): url is string {
  if (typeof url !== "string" || url.length > 2048) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  const raw = matchClipPath(parsed.pathname);
  if (!raw) return false;
  const n = parsed.searchParams.get("n");
  return parseClipParams(n === null ? raw : { ...raw, n }).ok;
}

const videoIdSchema = z.string().regex(VIDEO_ID_RE);

// Up to 9 digits per side keeps the numbers safe integers while rejecting junk like "1e5" or "-5".
const rangeSchema = z
  .string()
  .regex(/^\d{1,9}-\d{1,9}$/)
  .transform((value) => {
    const [start, end] = value.split("-").map(Number) as [number, number];
    return { start, end };
  });

// Search params can repeat (?n=a&n=b). Use the first value.
const noteSchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => cleanNote(Array.isArray(value) ? value[0] : value));

const fail = (reason: ClipErrorReason): ClipParseResult => ({ ok: false, reason });

/** Validates clip route params. Never throws. */
export function parseClipParams(params: ClipParamsInput): ClipParseResult {
  const id = videoIdSchema.safeParse(params.videoId);
  if (!id.success) return fail("bad_id");

  const range = rangeSchema.safeParse(params.range);
  if (!range.success) return fail("bad_range");
  const { start, end } = range.data;

  if (end < start) return fail("bad_range");
  const length = end - start;
  if (length < MIN_CLIP_SECONDS) return fail("too_short");
  if (length > MAX_CLIP_SECONDS) return fail("too_long");

  // A note of the wrong type (not a string) is ignored rather than breaking the clip.
  const noteResult = noteSchema.safeParse(params.n);
  const note = noteResult.success ? noteResult.data : undefined;
  if (note !== undefined && noteLength(note) > MAX_NOTE_LENGTH) return fail("note_too_long");

  return { ok: true, clip: note === undefined ? { videoId: id.data, start, end } : { videoId: id.data, start, end, note } };
}

/**
 * Splits a pathname shaped like `/c/{videoId}/{range}` into raw params, without validating them.
 * Returns null for any other path.
 */
export function matchClipPath(pathname: string): { videoId: string; range: string } | null {
  const match = /^\/c\/([^/]+)\/([^/]+)\/?$/.exec(pathname);
  if (!match) return null;
  try {
    return { videoId: decodeURIComponent(match[1]!), range: decodeURIComponent(match[2]!) };
  } catch {
    return null;
  }
}

/** `https://www.youtube.com/watch?v={id}&t={start}s` */
export function youtubeWatchUrl(videoId: string, start: number): string {
  const t = Number.isFinite(start) && start > 0 ? Math.floor(start) : 0;
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${t}s`;
}
