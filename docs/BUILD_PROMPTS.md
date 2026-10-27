# Just This Bit: Build Prompts for Claude Code

Run the phases in order. Paste one prompt per Claude Code session (or `/clear` between phases). Do not start the next phase until the current one is live and working.

## Phase 0: Setup (you, about 15 minutes, all free)

1. Install Node.js LTS, Git, and Claude Code if not already installed.
2. Create a free GitHub repo named `justthisbit` (private is fine).
3. Create a local folder, then place the files:
   - `CLAUDE.md` in the folder root
   - `SPEC.md` and `BUILD_PROMPTS.md` inside a `docs/` folder
4. Sign in to vercel.com with GitHub (Hobby plan, free). Do not import the repo yet; Phase 1 does that after the first push.
5. Open the folder in a terminal and start Claude Code.

## Phase 1: Scaffold, core libraries, first deploy

```
Read CLAUDE.md and docs/SPEC.md fully before doing anything.

Phase 1 goal: project scaffold, the three core libraries with full unit tests, and a first production deploy.

1. Scaffold a Next.js app (latest stable, App Router, TypeScript strict, Tailwind, ESLint) in the current folder without overwriting CLAUDE.md or docs/. Use npm with --legacy-peer-deps.
2. Add Zod, Vitest, and Playwright. Add npm scripts: typecheck, lint, test, test:e2e, build, check (typecheck + lint + test + build in sequence).
3. Create lib/site.ts (site name "Just This Bit", site URL from VERCEL_PROJECT_PRODUCTION_URL with localhost fallback).
4. Implement lib/youtube.ts, lib/time.ts, lib/clip.ts, lib/oembed.ts exactly as specified in SPEC section 4.
5. Write the unit tests from SPEC 8.1. At least 40 cases for lib/youtube.ts. All must pass.
6. Set up the design tokens from CLAUDE.md (colors, Bricolage Grotesque via next/font) and a placeholder home page with the site name.
7. Add security headers from SPEC section 7 in next.config.
8. Initialize git, commit, add the GitHub remote I give you, push to main.

Then stop and tell me: the exact steps to import the repo in Vercel, which project name to use so the URL becomes justthisbit.vercel.app (and what to do if it is taken). After I confirm it is deployed, open the live URL and confirm the placeholder page loads.

Report what passed, what failed, and anything partial.
```

## Phase 2: Viewer page (the heart of the product)

```
Read CLAUDE.md and docs/SPEC.md. Phase 1 is live.

Phase 2 goal: the clip viewer page from SPEC 5.1, fully tested.

1. Build a shared IFrame API loader (loads https://www.youtube.com/iframe_api once, safe with multiple mounts and React strict mode).
2. Build a reusable hook useClipPlayer(videoId, start, end) that owns: player creation with the playerVars in SPEC 5.1, referrerpolicy on the iframe, 200ms end polling with the crossing rule, ENDED handling, replay, error codes, and the 10 second onReady timeout. Clean up intervals and the player on unmount.
3. Build /c/[videoId]/[range]: server metadata exactly as in SPEC 5.1 (title, description, og tags, noindex), invalid params page with HTTP 404, the layout, the end panel below the player (never over it), and the fallback card.
4. Build the Playwright mock of the YouTube IFrame API described in SPEC 8.2 (route interception, fake YT.Player with a test-driven clock). Write every viewer, end-enforcement, error, timeout and broken-link e2e test from SPEC 8.2.
5. npm run check and npm run test:e2e must pass. Commit and push to main.
6. After the deploy finishes, fetch a live clip URL with curl and show me the og:title, og:description and og:image tags from the real HTML. Give me 3 live clip links (one normal, one with a note containing emoji, one with an embedding-disabled music video) to test on my phone.

Report what passed, what failed, and anything partial.
```

## Phase 3: Create page

```
Read CLAUDE.md and docs/SPEC.md. Phases 1 and 2 are live.

Phase 3 goal: the create page from SPEC 5.2.

1. Build / exactly as SPEC 5.2: paste field with Paste button, ?url= and ?v=&t= pre-fill, live parsing, editor with start and end rows (time field, Set to now, nudges), duration chips, default end, length readout, validation, Preview using useClipPlayer, desktop keyboard shortcuts, embed-error warning, note with counter, output with Share / WhatsApp / Copy / Open, and recent clips in localStorage (try/catch everywhere).
2. Mobile first. Check it at 360px, 390px and 1280px widths. No horizontal scroll.
3. Add the create-flow e2e tests from SPEC 8.2 using the existing YouTube mock.
4. npm run check and npm run test:e2e must pass. Commit and push to main.
5. After the deploy, open the live site and walk through the create flow end to end, then give me one clip link you created through the real UI.

Report what passed, what failed, and anything partial.
```

## Phase 4: Share sheet, install page, bookmarklet

```
Read CLAUDE.md and docs/SPEC.md. Phases 1 to 3 are live.

Phase 4 goal: the creation surfaces from SPEC 5.3, 5.4 and section 6.

1. Generate the app icon (simple mark in #FF4D1C on #080808, a play triangle cut by a bracket or similar, no text) as SVG, then a one-off script that exports 192, 512, 512 maskable and 180 apple-touch PNGs into /public. Commit the PNGs.
2. app/manifest.ts with the share_target from SPEC 6.1. Minimal network-only service worker at /sw.js, registered in production only.
3. /share route from SPEC 5.3 with e2e tests for URL-in-url and URL-in-text inputs, including an Android-style text like "Check this out https://youtu.be/ID?si=abc&t=90".
4. /install page from SPEC 5.4: device detection to open the right section, real install button via beforeinstallprompt on Android, the iPhone Shortcut steps from SPEC 6.2 with a placeholder for my iCloud link, and the desktop bookmarklet from SPEC 6.3 with the site origin injected.
5. Link to /install from the home page footer.
6. npm run check and npm run test:e2e must pass. Commit and push to main.
7. After the deploy, verify on the live site that the manifest loads and has no errors, and that the service worker registers. Show me the evidence.

Report what passed, what failed, and anything partial.
```

## Phase 5: Hardening and release

```
Read CLAUDE.md and docs/SPEC.md. Phases 1 to 4 are live.

Phase 5 goal: production quality. Go through SPEC section 7 and 8 line by line and close every gap.

1. Error boundaries on every route with the message and link from SPEC 7.
2. Vercel Web Analytics (free tier) added.
3. Accessibility pass: labels, focus states, tap targets, keyboard reachability.
4. Run Lighthouse (mobile) on a live viewer page and the home page. Fix anything that keeps viewer performance under 90.
5. Review lib/youtube.ts against every format in SPEC 4.1 again and add any missing tests.
6. Audit for any Referrer-Policy value that could suppress the referrer, anywhere in the app.
7. Run the full test suite. Commit and push to main.
8. After the deploy, produce a release report: every SPEC requirement marked done, partial, or missing, with evidence (test name, live URL, or curl output). Then give me the manual device checklist from SPEC 8.3 to run on my phone.

Report what passed, what failed, and anything partial.
```

## Phase 6: Device testing (you)

1. Run the checklist from SPEC 8.3 on your phone and a friend's iPhone.
2. On iPhone, build the "Clip it" Shortcut using the steps on `/install`, then in Shortcuts tap the shortcut's share button and copy its iCloud link.
3. Give that link to Claude Code with the prompt below.

```
Add this iCloud Shortcut link to the iPhone section of /install as a big "Get the Clip it shortcut" button: PASTE_LINK_HERE. Run checks, push, and confirm it is live.
```

## When something breaks

```
Bug on the live site.

What I did: DESCRIBE_STEPS
What I expected: EXPECTED
What happened: ACTUAL
Device and app: e.g. iPhone 13, opened from WhatsApp
Link: PASTE_CLIP_LINK

Reproduce it first with a failing test (unit or e2e with the YouTube mock). Then fix it, make the test pass, run npm run check and npm run test:e2e, push, and verify the fix on the live URL.
```
