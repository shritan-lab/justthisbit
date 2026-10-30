import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { preconnect } from "react-dom";
import { ClipViewer } from "@/components/viewer/clip-viewer";
import { parseClipParams, youtubeWatchUrl } from "@/lib/clip";
import { brokenClipMetadata, clipMetadata } from "@/lib/clip-metadata";
import { getVideoMeta } from "@/lib/oembed";
import { youtubeThumbnailUrl } from "@/lib/youtube-embed";

type Props = PageProps<"/c/[videoId]/[range]">;

// Invalid links never reach this page: proxy.ts sends them to app/not-found.tsx with a 404,
// because a streamed page can no longer change its status code. The checks here are a backstop.

async function readClip({ params, searchParams }: Props) {
  const [{ videoId, range }, query] = await Promise.all([params, searchParams]);
  return parseClipParams({ videoId, range, n: query.n });
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const result = await readClip(props);
  if (!result.ok) return brokenClipMetadata;
  const meta = await getVideoMeta(result.clip.videoId);
  return clipMetadata(result.clip, meta);
}

export default function ClipPage(props: Props) {
  // Open the connections early: the player script and embed come from www.youtube.com, the
  // thumbnail from i.ytimg.com. Part of the static shell, so the hints are in the first bytes.
  preconnect("https://www.youtube.com");
  preconnect("https://i.ytimg.com");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <Suspense fallback={<ViewerSkeleton />}>
        <ClipContent {...props} />
      </Suspense>
    </main>
  );
}

async function ClipContent(props: Props) {
  const result = await readClip(props);
  if (!result.ok) notFound();
  const { videoId, start, end, note } = result.clip;

  return (
    <ClipViewer
      videoId={videoId}
      start={start}
      end={end}
      note={note}
      watchUrl={youtubeWatchUrl(videoId, start)}
      thumbnailUrl={youtubeThumbnailUrl(videoId)}
      source={
        <Suspense fallback={null}>
          <VideoSource videoId={videoId} />
        </Suspense>
      }
    />
  );
}

async function VideoSource({ videoId }: { videoId: string }) {
  const meta = await getVideoMeta(videoId);
  if (!meta) return null;
  return (
    <p data-testid="video-source" className="break-words">
      From <span className="text-ink">{meta.title}</span>
      {meta.authorName ? <> · {meta.authorName}</> : null}
    </p>
  );
}

function ViewerSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-5">
      <div className="h-7 w-2/3 rounded-md bg-surface" />
      <div className="aspect-video w-full rounded-xl bg-surface" />
    </div>
  );
}
