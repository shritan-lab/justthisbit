# Just This Bit: Product and Technical Spec (v1)

## 1. Goal
Share a specific part of a long YouTube video as one link. The friend opens it, taps play, watches only that part, and is done.

v1 is a personal tool that must work reliably every time. It costs nothing to run. Growth features come later, only if people actually use it.

"Just This Bit" is a working name. It lives in one constant (`lib/site.ts`) so it can change in one place.

## 2. Users and flows

### 2.1 Sender on Android (main flow)
1. Watching in the YouTube app. Taps **Share**. Optionally turns on the timestamp toggle so the link starts at the current moment.
2. Picks **Just This Bit** in the share sheet (installed as a web app, see 6.1).
3. The create page opens with the video loaded and the start time pre-filled from `?t=` if present.
4. Taps a duration chip (+15s, +30s, +1m, +2m) or sets the end manually. Optionally previews. Optionally adds a note.
5. Taps **Share** (native share sheet) or **WhatsApp**. Done.

### 2.2 Sender on iPhone
Same as Android, but the entry point is an iOS Shortcut named "Clip it" in the share sheet (see 6.2). Fallback: copy the link in YouTube, open the site, paste.

### 2.3 Sender on desktop
A bookmarklet ("Clip this") on the bookmarks bar. On a YouTube watch page it opens the create page with the video and the current playback time pre-filled (see 6.3). Fallback: paste the link.

Chrome users can instead load the unpublished extension (see 6.4) and make the link right on YouTube without leaving the video.

### 2.4 Receiver (any device)
1. Sees a WhatsApp/iMessage preview: video thumbnail, title "▶ 0:42 clip · {video title}", and the note if the sender added one.
2. Opens the link in the browser. Sees the note, the clip length, and the YouTube player cued to the start.
3. Taps play. The clip plays and pauses at the end.
4. An end panel appears below the player: **Replay**, **Watch the full video on YouTube** (starts at the clip's start), **Make your own clip**.

## 3. URL design

### 3.1 Clip link (stateless)
```
/c/{videoId}/{start}-{end}?n={note}
```
- `videoId`: exactly 11 chars, `[A-Za-z0-9_-]`.
- `start`, `end`: whole seconds, non-negative integers.
- Rules: `end > start`, `end - start >= 1`, `end - start <= 3600`.
- `n`: optional note, URL-encoded, max 140 characters after decoding. Rendered as plain text only.
- Example: `/c/dQw4w9WgXcQ/90-132?n=watch%20his%20face`

### 3.2 Create page entry params
```
/?url={any YouTube or Just This Bit URL}
/?v={videoId}&t={seconds}
```
Both are optional. The share target, iOS Shortcut and bookmarklet all use these.

### 3.3 Reserved for later
`/s/{shortId}` is reserved for database-backed short links if the product grows. Stateless `/c/` links must keep working forever.

## 4. Core libraries (all unit-tested)

### 4.1 `lib/youtube.ts`
`parseYouTubeInput(input: string): { videoId: string; startSeconds?: number } | null`

Must handle:
- `youtube.com/watch?v=ID`, `m.youtube.com`, `music.youtube.com`, `www.` and no `www.`
- `youtu.be/ID`
- `youtube.com/shorts/ID`, `/live/ID`, `/embed/ID`, `/v/ID`, `youtube-nocookie.com/embed/ID`
- Extra params in any order (`si`, `feature`, `list`, `index`, `pp`)
- Time params `t` and `start` in forms `90`, `90s`, `1m30s`, `1h2m3s`
- URLs surrounded by other text, e.g. Android shares like `Check this out https://youtu.be/ID?si=abc&t=90`
- Missing `https://`
- Our own clip links (`/c/ID/90-132`): return the videoId and start so a sender can re-edit
- Returns `null` for anything else (playlists without a video, channels, random text)

### 4.2 `lib/time.ts`
- `parseTimeInput(s)`: accepts `90`, `1:30`, `01:02:03`, `1m30s`, `1h2m3s`. Returns seconds or `null`.
- `formatClock(seconds)`: `0:42`, `1:30`, `1:02:03`.
- `formatDuration(seconds)`: `42s`, `1m 30s`, `1h 2m`.

### 4.3 `lib/clip.ts`
- `buildClipPath({ videoId, start, end, note? })`: returns the `/c/...` path. Trims the note, drops it if empty.
- `parseClipParams(params)`: Zod-validated. Returns a typed clip or a typed error reason (`bad_id`, `bad_range`, `too_long`, `too_short`, `note_too_long`).
- `youtubeWatchUrl(videoId, start)`: `https://www.youtube.com/watch?v={id}&t={start}s`.

### 4.4 `lib/oembed.ts`
- `getVideoMeta(videoId)`: fetches `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={id}&format=json`.
- 3 second timeout. Cached by Next fetch for 24 hours.
- Returns `{ title, authorName }` or `null`. Never throws. The page must render fine when it returns `null`.

## 5. Pages

### 5.1 Viewer: `/c/[videoId]/[range]`
Server component for metadata, client component for the player.

**Metadata (drives WhatsApp and iMessage previews):**
- `title`: `▶ {formatClock(len)} clip · {video title}`. Fallback: `▶ {len} YouTube clip`.
- `description`: the note if present, else `From {start} to {end} of "{title}" by {author}`.
- `og:image`: `https://i.ytimg.com/vi/{id}/hqdefault.jpg` (always exists, small, loads fast in previews), with `og:image:width` 480 and `og:image:height` 360.
- `og:type` `video.other`, `twitter:card` `summary_large_image`, `metadataBase` from the site URL.
- Invalid params: render a friendly "This clip link looks broken" page with a link to the create page, HTTP 404, and `noindex`.

**Player behavior:**
- Load the IFrame API script once (`https://www.youtube.com/iframe_api`) with a shared loader that handles multiple mounts.
- `playerVars`: `start`, `playsinline: 1`, `rel: 0`, `enablejsapi: 1`, `origin: window.location.origin`. Do NOT pass `end`. Our own logic owns the end (the native `end` param misbehaves on replay).
- The iframe has `referrerpolicy="strict-origin-when-cross-origin"`.
- Do not autoplay. The viewer taps YouTube's own play button (reliable on iOS and counts the view for the creator).
- **End enforcement:** while playing, poll `getCurrentTime()` every 200ms. When the time crosses from below `end` to at or above `end`, pause and show the end panel. If the viewer deliberately seeks outside the clip range, do not fight them. Only enforce when crossing `end` from inside the range.
- If `end` is beyond the video length, treat state `ENDED` as the clip end.
- **Replay:** `seekTo(start, true)` then `playVideo()`.
- Nothing is ever drawn on top of the player. The end panel sits below it and is scrolled into view.

**Errors (all must show the fallback card, never a black box):**
- `onError` codes 2, 5, 100, 101, 150, 153, or any unknown code.
- `onReady` not fired within 10 seconds.
- Fallback card: thumbnail, "This video can't play here", and a big button **Open on YouTube at {start}** linking to `youtubeWatchUrl`. Show the end time as text ("stop at 2:12").

**Layout (mobile first):** note (if any) as the headline, then "{0:42} clip · starts at 1:30", then the 16:9 player, then the end panel slot, then a small "Make your own clip" link and the source video title and channel.

### 5.2 Create: `/`
Client page.

**Input:** a single paste field, autofocused, with a Paste button (uses `navigator.clipboard.readText()` when available, hidden otherwise). Pre-filled from `?url=` or `?v=&t=`. Parses live with `parseYouTubeInput`. Clear inline error for invalid input.

**Editor (after a valid video loads):**
- YouTube player cued at the start time.
- Start and End rows, each with: time field (accepts any `parseTimeInput` format), **Set to now** button, nudge buttons −5s, −1s, +1s, +5s.
- Duration chips: +15s, +30s, +1m, +2m (set end = start + chip).
- Default end when only a start is known: start + 30s.
- Live length readout ("0:42 clip"). Validation messages for end before start and over 60 minutes.
- **Preview** button: seeks to start, plays, pauses at end using the same end logic as the viewer (shared hook `useClipPlayer`).
- Desktop keyboard shortcuts: `I` set start, `O` set end, `P` preview. Ignore shortcuts while typing in inputs.
- If the player reports an embed error (101, 150, 153), show a warning: "This video can't play outside YouTube. Your link still works: your friend gets a button that opens YouTube at the right time." Link creation stays allowed.

**Note:** optional text field, 140 char limit with counter.

**Output:**
- The full clip URL, shown and selectable.
- **Share** button: `navigator.share({ title, text: note, url })`. Hidden if unsupported.
- **WhatsApp** button: `https://wa.me/?text={encodeURIComponent((note ? note + "\n" : "") + url)}`.
- **Copy** button: `navigator.clipboard.writeText` with a hidden-textarea fallback. Shows "Copied" for 2 seconds.
- **Open** link to test the clip page.

**Recent clips:** last 20 created clips stored in `localStorage` on this device (title, range, url). Shown below the editor with copy buttons and a clear-all button. Wrapped in try/catch.

### 5.3 Share target handler: `/share`
Receives Android share-sheet data (GET params `title`, `text`, `url`). Runs `parseYouTubeInput` on `url`, then `text`, then `title`. On success, redirect to `/?v={id}&t={start}`. On failure, redirect to `/?url={raw}` so the create page shows the parse error with the raw input.

### 5.4 Install help: `/install`
One page with three sections, auto-opening the section that matches the visitor's device:
- **Android:** how to install the web app (browser menu, "Add to Home screen" / "Install app") and that it then appears in YouTube's share menu. Show a real install button when the `beforeinstallprompt` event is available.
- **iPhone:** step-by-step to build the "Clip it" Shortcut (section 6.2) and a slot for an iCloud share link to the finished Shortcut (added manually later).
- **Desktop:** the draggable "Clip this" bookmarklet (section 6.3).

## 6. Creation surfaces

### 6.1 Android: installable web app + share target
- `app/manifest.ts`: name, short_name, `start_url: "/"`, `display: "standalone"`, `background_color` and `theme_color` `#080808`, icons 192, 512 and 512 maskable.
- `share_target`: `{ action: "/share", method: "GET", params: { title: "title", text: "text", url: "url" } }`.
- Minimal service worker at `/sw.js`, registered in production only. Network-only (no caching of pages) so users never see stale clips. It exists only to satisfy installability.
- Icons generated once by a script into `/public` (plus `apple-touch-icon.png` 180px).

### 6.2 iPhone: "Clip it" Shortcut
Built by hand in the Shortcuts app (free), then shared with friends via an iCloud link:
1. New shortcut named "Clip it". In its settings, turn on **Show in Share Sheet** and accept **URLs** and **Text**.
2. Action **URL Encode** with input Shortcut Input.
3. Action **Text**: `https://{site}/?url={URL Encoded Text}`.
4. Action **Open URLs**.
Web share targets are not supported on iOS, which is why this route is used.

### 6.3 Desktop: bookmarklet
A `javascript:` link on `/install` that:
- Reads the video id from the current page URL (`v` param, `/shorts/`, `/live/`).
- Reads `document.querySelector('video')?.currentTime`.
- Opens `https://{site}/?v={id}&t={floor(time)}` in a new tab.
- Shows `alert("Open a YouTube video first")` on non-video pages.
The site origin is injected at build time from the site URL.

### 6.4 Desktop: Chrome extension (Phase 4b, unpublished)
A Manifest V3 extension in `extension/`, loaded by hand with **Load unpacked** in developer mode. It is never published (the Chrome Web Store fee is out of scope, see 9).

- **Clip button:** on `youtube.com` watch, `/live/` and `/shorts/` pages, a "Clip" button in the action row next to Like and Share. Never drawn on top of the video. On Shorts, if the action bar overlaps the video (narrow windows), no button is placed.
- **Single-page app:** placement re-runs on every `yt-navigate-finish` event, with a MutationObserver as backup. Placement is idempotent: never two buttons. Navigating to another video closes the panel.
- **Panel:** opens below the action row on watch pages, and beside the video on Shorts (only where it fits without covering the video). Start and End, each with a time field and **Set to now** (reads the page's video time), length chips +15s, +30s, +1m, +2m, an optional note (140 characters), a live length readout, the create page's validation messages, **Copy link** and **Open**. When it opens, start = current time (rounded down) and end = start + 30s.
- **Keyboard:** Alt+Shift+S sets start to now, Alt+Shift+E sets end to now, Alt+Shift+C copies the link. Ignored while typing in a field. Shown as a hint in the panel.
- **Popup fallback:** clicking the toolbar icon on a YouTube video opens the same panel in a popup, for when YouTube changes its layout and the in-page button can't be placed. It asks the tab's content script for the video and time, and falls back to the tab URL (via `activeTab`) when the content script is not there yet.
- **Links:** always `https://justthisbit.vercel.app/c/{videoId}/{start}-{end}?n={note}`. Built with `lib/clip.ts`, `lib/clip-draft.ts`, `lib/time.ts` and `lib/youtube.ts`, bundled in, never copied.
- **Permissions:** content script on `https://www.youtube.com/*` only, `clipboardWrite`, `activeTab`. No host permissions, no background worker, no remote code, no analytics, no network requests.
- **Build:** `npm run ext:build` bundles with Vite into `extension/dist` (git-ignored). Icons come from `app/icon.svg` via `npm run icons`. The Next.js build, typecheck and Vercel deploy ignore `extension/`.
- **Tests:** unit tests in `extension/src/*.test.ts`. A Playwright project (`extension`) loads `extension/dist` into Chromium against a fake youtube.com page and checks placement, navigation, Set to now, copying, shortcuts, Shorts and the popup.

## 7. Non-functional requirements
- **Security headers** (in `next.config`): `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `Permissions-Policy` disabling camera, microphone, geolocation.
- **Performance:** viewer page JS kept small. The player script loads only on pages that need it. Lighthouse mobile performance 90+ on the viewer page.
- **Accessibility:** labeled inputs, visible focus states, 44px tap targets, all actions reachable by keyboard.
- **SEO:** clip pages `noindex` (they are personal shares). Home page indexable.
- **Analytics:** Vercel Web Analytics (free tier) only. No other trackers, no cookie banner needed.
- **Monitoring:** Vercel runtime logs. A client-side error boundary on every page with a "Something broke. Reload" message and a link to the create page.

## 8. Testing

### 8.1 Unit (Vitest)
- `lib/youtube.ts`: at least 40 cases across every format in 4.1, including junk input.
- `lib/time.ts` and `lib/clip.ts`: all formats, boundaries (0, 1s, 3600s, 3601s), invalid values, note length and encoding (emoji, newlines, `&`, `#`, `?`).

### 8.2 End-to-end (Playwright, mobile and desktop viewports)
Mock the YouTube IFrame API by intercepting `https://www.youtube.com/iframe_api` and serving a fake `YT.Player` whose clock can be driven from the test. This keeps tests deterministic and offline. Cover:
- Create flow: paste a URL with `t=90`, start shows 1:30, +30s sets end 2:00, the generated link is correct, copy works.
- Viewer: correct `<title>`, `og:title`, `og:description`, `og:image` in the HTML.
- End enforcement: fake clock crosses `end`, player is paused, end panel visible, Replay seeks to start.
- Seeking outside the range does not trigger a pause.
- Error path: fake player fires error 150, fallback card with the correct YouTube link appears.
- Timeout path: fake player never fires `onReady`, fallback appears after 10s (use fake timers).
- Broken links: bad id, `end < start`, over 3600s all show the broken-link page with status 404.
- `/share` redirects correctly for URL-in-`text` and URL-in-`url` inputs.

### 8.3 Manual device checklist (run on the live URL before calling v1 done)
- [ ] Android: install the web app, share from the YouTube app with and without the timestamp toggle, link created.
- [ ] Android WhatsApp: preview shows thumbnail and "▶ 0:42 clip · title". Opening plays and stops at the end.
- [ ] iPhone: "Clip it" shortcut works from the YouTube app share sheet.
- [ ] iPhone WhatsApp and iMessage: preview correct, playback stops at the end.
- [ ] Desktop Chrome: bookmarklet pre-fills video and time.
- [ ] A music video with embedding disabled: sender sees the warning, receiver gets the "Open on YouTube at 1:30" fallback.
- [ ] A deleted or private video link: fallback card, no black box.
- [ ] A YouTube Shorts link and a live stream replay link both work.
- [ ] Links with emoji and newlines in the note survive WhatsApp.

## 9. Out of scope for v1 (costs money or needs a database)
| Feature | Why deferred |
|---|---|
| Custom domain | Costs money. `*.vercel.app` works fine for previews. |
| Chrome Web Store listing | $5 developer fee. The bookmarklet covers desktop for free, and the extension (6.4) is loaded unpacked. |
| Native iOS app with share extension | $99/yr Apple developer fee. The Shortcut covers iPhone for free. |
| Short links, view counts, "your friend watched it" | Need a database. Revisit if people use the product. |
| Accounts, clip history across devices | Same. |
| Multi-clip sequences | Nice to have. Revisit after real usage. |
| Monetization | Check YouTube API policies on ads around embedded players before any attempt. Vercel Hobby is non-commercial, so this also means moving to a paid plan. |
