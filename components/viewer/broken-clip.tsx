import Link from "next/link";
import { StatusPage, primaryAction } from "@/components/status-page";
import { BROKEN_CLIP_TITLE } from "@/lib/clip-metadata";

export function BrokenClip() {
  return (
    <StatusPage
      testId="broken-clip"
      title={BROKEN_CLIP_TITLE}
      actions={
        <Link href="/" className={primaryAction}>
          Make a clip
        </Link>
      }
    >
      Part of it may have been cut off when it was copied. Ask for the link again, or make a new clip.
    </StatusPage>
  );
}
