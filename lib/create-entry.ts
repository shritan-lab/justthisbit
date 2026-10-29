import { z } from "zod";
import { parseTimeInput } from "./time";
import { isValidVideoId } from "./video-id";
import { parseYouTubeInput, youtubeShortUrl } from "./youtube";

// Pasted text past this point is never useful, and keeps a hostile ?url= from bloating the page.
export const MAX_ENTRY_INPUT_LENGTH = 2000;

/** The create page entry params from SPEC 3.2: `/?url=...` and `/?v={id}&t={seconds}`. */
export type CreateEntryParams = {
  url?: string | null;
  v?: string | null;
  t?: string | null;
};

const paramSchema = z
  .string()
  .nullish()
  .transform((value) => value?.trim().slice(0, MAX_ENTRY_INPUT_LENGTH) || undefined);

const entrySchema = z.object({ url: paramSchema, v: paramSchema, t: paramSchema });

/**
 * What the paste field starts with.
 *
 * - A valid `v` wins and becomes a youtu.be link, with `t` as its start when `t` is a valid time.
 * - Otherwise `url` is used as is, so the page shows the parse error with the raw text (SPEC 5.3).
 * - An invalid `v` with no `url` is shown too, so the sender sees why nothing loaded.
 */
export function initialPasteInput(params: CreateEntryParams): string {
  const parsed = entrySchema.safeParse(params);
  if (!parsed.success) return "";
  const { url, v, t } = parsed.data;

  if (isValidVideoId(v)) {
    const start = t === undefined ? null : parseTimeInput(t);
    return youtubeShortUrl(v, start ?? undefined);
  }
  return url ?? v ?? "";
}

/**
 * The video id when the page was opened with a video link that has no time in it
 * (a share with YouTube's "Start at" switch off). The create page then asks where the sender paused.
 * A zero time counts as no time, the same way /share drops it.
 */
export function entryVideoWithoutTime(params: CreateEntryParams): string | null {
  const input = initialPasteInput(params);
  if (input === "") return null;
  const parsed = parseYouTubeInput(input);
  return parsed && !parsed.startSeconds ? parsed.videoId : null;
}

/** True when the page was opened with something to pre-fill. Used to skip autofocus. */
export function hasEntryInput(params: CreateEntryParams): boolean {
  return initialPasteInput(params) !== "";
}
