import type { Metadata } from "next";
import Link from "next/link";
import { InstallGuide } from "@/components/install/install-guide";
import { buildBookmarklet } from "@/lib/bookmarklet";
import { INSTALL_PROMPT_SCRIPT } from "@/lib/install-prompt";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: `Get it on your phone · ${SITE_NAME}`,
  description: `Add ${SITE_NAME} to your share menu on Android, iPhone or your computer.`,
};

/** Install help (SPEC 5.4). */
export default function InstallPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      {/* Catches Chrome's install event before hydration. See lib/install-prompt.ts. */}
      <script dangerouslySetInnerHTML={{ __html: INSTALL_PROMPT_SCRIPT }} />
      <header className="flex flex-col gap-2">
        <Link href="/" className="inline-flex min-h-11 items-center self-start text-sm font-medium text-muted hover:text-ink">
          ← {SITE_NAME}
        </Link>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Get it on your phone</h1>
        <p className="text-lg text-muted">Clip from YouTube&apos;s Share button, without copying and pasting.</p>
      </header>
      <InstallGuide siteUrl={SITE_URL} bookmarklet={buildBookmarklet(SITE_URL)} />
    </main>
  );
}
