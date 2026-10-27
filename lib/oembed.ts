import { cacheLife } from "next/cache";
import { z } from "zod";
import { isValidVideoId } from "./video-id";

export const OEMBED_TIMEOUT_MS = 3000;
export const DEFAULT_OEMBED_ENDPOINT = "https://www.youtube.com/oembed";

const ONE_HOUR_SECONDS = 60 * 60;
const ONE_DAY_SECONDS = ONE_HOUR_SECONDS * 24;
const ONE_WEEK_SECONDS = ONE_DAY_SECONDS * 7;

export type VideoMeta = {
  title: string;
  authorName: string;
};

const oembedSchema = z.object({
  title: z.string(),
  author_name: z.string().optional(),
});

/**
 * OEMBED_ENDPOINT only exists so the e2e tests can point at a local stub and stay offline.
 * Production never sets it.
 */
function oembedEndpoint(): string {
  const override = process.env.OEMBED_ENDPOINT?.trim();
  return override && /^https?:\/\//i.test(override) ? override : DEFAULT_OEMBED_ENDPOINT;
}

export function oembedUrl(videoId: string): string {
  const watch = `https://www.youtube.com/watch?v=${videoId}`;
  return `${oembedEndpoint()}?url=${encodeURIComponent(watch)}&format=json`;
}

/**
 * Returns null for answers that will not change soon (private, deleted, embedding off, odd body),
 * so they are cached. Throws for blips (network, 5xx, rate limit) so they are not cached.
 */
async function fetchMeta(videoId: string): Promise<VideoMeta | null> {
  const res = await fetch(oembedUrl(videoId));
  if (res.status === 429 || res.status >= 500) throw new Error(`oEmbed answered ${res.status}`);
  if (!res.ok) return null;
  const parsed = oembedSchema.safeParse(await res.json());
  if (!parsed.success) return null;
  const title = parsed.data.title.trim();
  if (!title) return null;
  return { title, authorName: parsed.data.author_name?.trim() ?? "" };
}

// With cacheComponents on, fetch is only cached inside a "use cache" scope.
// Thrown errors are never cached, so a blip does not stick for a day.
async function cachedFetchMeta(videoId: string): Promise<VideoMeta | null> {
  "use cache";
  cacheLife({ stale: ONE_HOUR_SECONDS, revalidate: ONE_DAY_SECONDS, expire: ONE_WEEK_SECONDS });
  return fetchMeta(videoId);
}

/**
 * Title and channel name for a video, from YouTube's public oEmbed endpoint.
 * Cached for a day. Returns null on any failure or after 3 seconds. Never throws.
 */
export async function getVideoMeta(videoId: string): Promise<VideoMeta | null> {
  if (!isValidVideoId(videoId)) return null;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), OEMBED_TIMEOUT_MS);
  });

  try {
    return await Promise.race([cachedFetchMeta(videoId).catch(() => null), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
