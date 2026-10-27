import { BrokenClip } from "@/components/viewer/broken-clip";
import { brokenClipMetadata } from "@/lib/clip-metadata";

// Every unmatched URL lands here with HTTP 404, including invalid /c/... links,
// which proxy.ts rewrites to an unmatched path. Almost every visitor arrives on a clip link,
// so the copy speaks to that.
export const metadata = brokenClipMetadata;

export default function NotFound() {
  return <BrokenClip />;
}
