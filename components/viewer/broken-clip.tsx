import Link from "next/link";
import { BROKEN_CLIP_TITLE } from "@/lib/clip-metadata";

export function BrokenClip() {
  return (
    <main
      data-testid="broken-clip"
      className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-16 sm:px-6"
    >
      <div aria-hidden="true" className="h-1.5 w-12 rounded-full bg-accent" />
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{BROKEN_CLIP_TITLE}</h1>
      <p className="text-lg text-muted">
        Part of it may have been cut off when it was copied. Ask for the link again, or make a new clip.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-12 w-fit items-center justify-center rounded-full bg-accent px-6 text-base font-semibold text-accent-ink transition-opacity hover:opacity-90"
      >
        Make a clip
      </Link>
    </main>
  );
}
