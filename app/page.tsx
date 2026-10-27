import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-16">
      <div aria-hidden="true" className="mb-6 h-1.5 w-12 rounded-full bg-accent" />
      <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">{SITE_NAME}</h1>
      <p className="mt-4 text-lg text-muted sm:text-xl">{SITE_TAGLINE}</p>
    </main>
  );
}
