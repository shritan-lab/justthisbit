import { z } from "zod";
import { getVideoMeta } from "@/lib/oembed";
import { VIDEO_ID_RE } from "@/lib/video-id";

// The create page shows the video title and saves it with recent clips. YouTube's oEmbed sends
// no CORS headers, so the browser asks us and we reuse the cached server lookup.

const idSchema = z.string().regex(VIDEO_ID_RE);

export async function GET(_request: Request, ctx: RouteContext<"/api/video/[videoId]">) {
  const id = idSchema.safeParse((await ctx.params).videoId);
  if (!id.success) return Response.json({ error: "bad_id" }, { status: 400 });

  const meta = await getVideoMeta(id.data);
  return Response.json(meta ?? {}, {
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" },
  });
}
