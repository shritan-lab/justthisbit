import { Suspense } from "react";
import { CreateClip, CreateClipFallback } from "@/components/create/create-clip";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export default function Home() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
        <header className="flex flex-col gap-2">
          <div aria-hidden="true" className="mb-2 h-1.5 w-12 rounded-full bg-accent" />
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{SITE_NAME}</h1>
          <p className="text-lg text-muted">{SITE_TAGLINE}</p>
        </header>
        {/* The editor reads ?url= and ?v=&t=, so it renders in the browser behind this boundary. */}
        <Suspense fallback={<CreateClipFallback />}>
          <CreateClip />
        </Suspense>
      </main>
      <footer className="mx-auto w-full max-w-2xl px-4 pb-6 sm:px-6">
        <div className="border-t border-line pt-3 text-sm text-muted">
          {/* A full page load, not a client-side navigation, so /install can catch Chrome's install event. */}
          <a href="/install" className="inline-flex min-h-11 items-center font-medium hover:text-ink">
            Get it on your phone
          </a>
        </div>
      </footer>
    </>
  );
}
