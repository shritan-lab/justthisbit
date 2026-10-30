import Link from "next/link";
import { StatusPage, primaryAction } from "@/components/status-page";
import { NotFoundTitle } from "@/components/not-found-title";
import { BrokenClip } from "@/components/viewer/broken-clip";
import { brokenClipMetadata } from "@/lib/clip-metadata";
import { PAGE_NOT_FOUND_TITLE, notFoundScript } from "@/lib/not-found";

// Every unmatched URL lands here with HTTP 404, including invalid /c/... links, which proxy.ts
// rewrites to an unmatched path. The page stays static (it is part of every page's payload), so
// the message is picked in the browser before it paints. See lib/not-found.ts.
export const metadata = brokenClipMetadata;

const ID = "not-found";

export default function NotFound() {
  return (
    // The inline script sets data-kind before React hydrates, hence suppressHydrationWarning.
    <div id={ID} data-kind="clip" suppressHydrationWarning className="group/nf flex flex-1 flex-col">
      <script dangerouslySetInnerHTML={{ __html: notFoundScript(ID) }} />
      <NotFoundTitle />
      <div className="flex flex-1 flex-col group-data-[kind=page]/nf:hidden">
        <BrokenClip />
      </div>
      <div className="hidden flex-1 flex-col group-data-[kind=page]/nf:flex">
        <StatusPage
          testId="not-found"
          title={PAGE_NOT_FOUND_TITLE}
          actions={
            <Link href="/" className={primaryAction}>
              Make a clip
            </Link>
          }
        >
          Check the address for typos, or start over and make a new clip.
        </StatusPage>
      </div>
    </div>
  );
}
