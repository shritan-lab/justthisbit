import type { Metadata } from "next";
import { buildClipPath, type Clip } from "./clip";
import type { VideoMeta } from "./oembed";
import { SITE_NAME, SITE_URL } from "./site";
import { formatClock } from "./time";
import { youtubeThumbnailUrl } from "./youtube-embed";

export const OG_IMAGE_WIDTH = 480;
export const OG_IMAGE_HEIGHT = 360;

/** `▶ 0:42 clip · {video title}`, or `▶ 0:42 YouTube clip` when the title is unknown. */
export function clipTitle(clip: Clip, meta: VideoMeta | null): string {
  const length = formatClock(clip.end - clip.start);
  return meta ? `▶ ${length} clip · ${meta.title}` : `▶ ${length} YouTube clip`;
}

/** The note if there is one, else `From 1:30 to 2:12 of "{title}" by {author}`. */
export function clipDescription(clip: Clip, meta: VideoMeta | null): string {
  if (clip.note) return clip.note;
  const range = `From ${formatClock(clip.start)} to ${formatClock(clip.end)}`;
  if (!meta) return `${range} of a YouTube video`;
  const by = meta.authorName ? ` by ${meta.authorName}` : "";
  return `${range} of "${meta.title}"${by}`;
}

/** Page metadata for a clip. Drives WhatsApp and iMessage link previews (SPEC 5.1). */
export function clipMetadata(clip: Clip, meta: VideoMeta | null, siteUrl: string = SITE_URL): Metadata {
  const title = clipTitle(clip, meta);
  const description = clipDescription(clip, meta);
  const path = buildClipPath(clip);
  const image = {
    url: youtubeThumbnailUrl(clip.videoId),
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt: meta?.title ?? "YouTube video thumbnail",
  };

  return {
    metadataBase: new URL(siteUrl),
    title: { absolute: title },
    description,
    robots: { index: false },
    openGraph: {
      type: "video.other",
      siteName: SITE_NAME,
      title,
      description,
      url: path,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
  };
}

export const BROKEN_CLIP_TITLE = "This clip link looks broken";

export const brokenClipMetadata: Metadata = {
  title: { absolute: BROKEN_CLIP_TITLE },
  robots: { index: false },
};
