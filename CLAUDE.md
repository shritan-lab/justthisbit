# Just This Bit: project rules for Claude Code

## What this is
A web app that turns "watch from 1:30 to 2:12 of this long YouTube video" into one link. The friend opens the link, taps play, sees only that part, and the player stops at the end.

Full product and technical spec: `docs/SPEC.md`. Read it before starting any task. Build prompts per phase: `docs/BUILD_PROMPTS.md`.

## Hard constraints (never break these)
1. **Zero cost.** No database, no paid services, no accounts, no API keys. Hosting is Vercel Hobby on the free `*.vercel.app` subdomain. If a task seems to need a paid service or a database, stop and ask.
2. **Stateless links.** Everything a clip needs lives in its URL: `/c/{videoId}/{start}-{end}?n={note}`. No server-side storage.
3. **YouTube rules.** Never download, proxy, or re-host video. Only use the official YouTube IFrame Player API. Never draw anything on top of the YouTube player. Show our UI around it, not over it.
4. **Referrer policy.** Never set `Referrer-Policy` to `no-referrer` or `same-origin` anywhere (headers, meta tags, iframe attributes). YouTube embeds fail with Error 153 without a referrer. Use `strict-origin-when-cross-origin` explicitly.
5. **Single source of truth.** All YouTube URL parsing goes through `lib/youtube.ts`. All time parsing and formatting goes through `lib/time.ts`. All clip URL building and parsing goes through `lib/clip.ts`. Every change to these files ships with unit tests.
6. **Never trust input.** Validate every URL param and form value with Zod. Invalid input shows a friendly page, never a crash or a blank screen.
7. **Browser storage** (`localStorage`) is only for per-device conveniences (recent clips). Every read and write is wrapped in try/catch and the app works without it.

## Stack
- Next.js (latest stable, App Router) + TypeScript (strict) + Tailwind CSS
- Zod for validation
- Vitest for unit tests, Playwright for e2e tests
- Deployed on Vercel Hobby via GitHub push (auto-deploy on `main`)
- Site URL comes from `process.env.VERCEL_PROJECT_PRODUCTION_URL` with `http://localhost:3000` as the local fallback. Never hardcode the domain.

## Commands
- Install: `npm install --legacy-peer-deps`
- Dev: `npm run dev`
- Checks: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e`, `npm run build`
- `npm run check` runs typecheck, lint, unit tests and build in sequence. Run it before every commit.

## Design
- Base `#080808`, accent `#FF4D1C`, typeface Bricolage Grotesque (Google Fonts via `next/font`).
- Mobile-first. Most visitors arrive from WhatsApp on a phone. Tap targets at least 44px.
- Calm and fast. No particle networks, aurora blobs, magnetic buttons, glitch text, tilt cards or flip cards.
- If GSAP is ever used, it must be dynamically imported inside `useEffect` with `gsap.context()` cleanup. Prefer plain CSS transitions.

## Copy
- Plain, human, short. No em dashes anywhere in UI copy. No AI-sounding phrases ("seamless", "elevate", "unlock").

## Working style
- Keep the app small. Do not add features that are not in `docs/SPEC.md` without asking.
- Edit files with the file tools, never through PowerShell redirection (it corrupts encoding on Windows).
- Definition of done for any task: `npm run check` passes, `npm run test:e2e` passes, pushed to `main`, the Vercel production deploy succeeded, and the change was verified on the live URL. Say clearly if any of these did not happen.
