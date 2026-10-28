"use client";

import { useEffect, useState } from "react";
import { z } from "zod";

export type VideoMetaState = { title: string; authorName: string } | null;

const metaSchema = z.object({
  title: z.string().max(500).optional(),
  authorName: z.string().max(500).optional(),
});

/** Title and channel for the editor and recent clips. null while loading or when unknown. */
export function useVideoMeta(videoId: string): VideoMetaState {
  const [meta, setMeta] = useState<{ videoId: string; value: VideoMetaState }>({ videoId, value: null });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/video/${encodeURIComponent(videoId)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: unknown) => {
        const parsed = metaSchema.safeParse(body);
        const title = parsed.success ? parsed.data.title?.trim() : undefined;
        setMeta({
          videoId,
          value: title ? { title, authorName: parsed.success ? (parsed.data.authorName?.trim() ?? "") : "" } : null,
        });
      })
      .catch(() => {
        // Offline or aborted. The editor works without a title.
      });
    return () => controller.abort();
  }, [videoId]);

  return meta.videoId === videoId ? meta.value : null;
}
