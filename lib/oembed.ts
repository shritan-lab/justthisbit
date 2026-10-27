import { z } from "zod";
import { isValidVideoId } from "./video-id";

export const OEMBED_TIMEOUT_MS = 3000;
const ONE_DAY_SECONDS = 60 * 60 * 24;

export type VideoMeta = {
  title: string;
  authorName: string;
};

const oembedSchema = z.object({
  title: z.string(),
  author_name: z.string().optional(),
});

export function oembedUrl(videoId: string): string {
  const watch = `https://www.youtube.com/watch?v=${videoId}`;
  return `https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`;
}

async function fetchMeta(videoId: string): Promise<VideoMeta | null> {
  const res = await fetch(oembedUrl(videoId), {
    cache: "force-cache",
    next: { revalidate: ONE_DAY_SECONDS },
  });
  if (!res.ok) return null;
  const parsed = oembedSchema.safeParse(await res.json());
  if (!parsed.success) return null;
  const title = parsed.data.title.trim();
  if (!title) return null;
  return { title, authorName: parsed.data.author_name?.trim() ?? "" };
}

/**
 * Title and channel name for a video, from YouTube's public oEmbed endpoint.
 * Returns null on any failure or after 3 seconds. Never throws.
 */
export async function getVideoMeta(videoId: string): Promise<VideoMeta | null> {
  if (!isValidVideoId(videoId)) return null;

  // A race instead of an AbortSignal: passing a signal opts the fetch out of Next's
  // request deduplication, and the viewer page calls this from both metadata and render.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), OEMBED_TIMEOUT_MS);
  });

  try {
    return await Promise.race([fetchMeta(videoId).catch(() => null), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
