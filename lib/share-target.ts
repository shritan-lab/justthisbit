import { z } from "zod";
import { MAX_ENTRY_INPUT_LENGTH } from "./create-entry";
import { parseYouTubeInput } from "./youtube";

/** What Android's share sheet sends to /share (SPEC 5.3, manifest share_target). */
export type ShareTargetParams = {
  title?: string | null;
  text?: string | null;
  url?: string | null;
};

const fieldSchema = z
  .string()
  .nullish()
  .transform((value) => value?.trim().slice(0, MAX_ENTRY_INPUT_LENGTH) || undefined);

const shareSchema = z.object({ title: fieldSchema, text: fieldSchema, url: fieldSchema });

/**
 * Where /share sends the visitor.
 *
 * The YouTube app usually puts the link in `text` with words around it, sometimes in `url`,
 * sometimes in `title`. Each is tried in that order: url, text, title.
 * - Found a video: `/?v={id}` plus `&t={start}` when the link had a time.
 * - Found nothing: `/?url={raw}`, so the create page shows the raw text with its error.
 * - Empty share: `/`.
 */
export function shareTargetRedirect(params: ShareTargetParams): string {
  const parsed = shareSchema.safeParse(params);
  if (!parsed.success) return "/";
  const { url, text, title } = parsed.data;
  const fields = [url, text, title].filter((value): value is string => value !== undefined);

  for (const field of fields) {
    const result = parseYouTubeInput(field);
    if (!result) continue;
    const query = new URLSearchParams({ v: result.videoId });
    if (result.startSeconds !== undefined && result.startSeconds > 0) {
      query.set("t", String(result.startSeconds));
    }
    return `/?${query.toString()}`;
  }

  const raw = fields[0];
  return raw === undefined ? "/" : `/?${new URLSearchParams({ url: raw }).toString()}`;
}
