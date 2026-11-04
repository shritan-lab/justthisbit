<!-- demo gif here -->

# Just This Bit

Send a friend one link that plays only the part of a YouTube video you meant.

**Try it:** [justthisbit.vercel.app](https://justthisbit.vercel.app)

## The problem

Someone sends you a 40 minute video and says "the good part is around 12:30". You open it, it starts at the beginning, you scrub around, you give up. Sharing a moment from a long YouTube video usually means sending the whole thing plus a timestamp, and nobody watches.

## How it works

**If you are sending:**

1. Share a YouTube video to Just This Bit, or paste its link.
2. Pick where the clip starts and ends. Quick buttons add 15 seconds, 30 seconds, 1 minute or 2 minutes.
3. Add a short note if you like.
4. Send the link on WhatsApp, or copy it anywhere.

**If you are receiving:**

1. The chat shows a preview with the video thumbnail, the clip length and the note.
2. Open it and tap play. The video starts at the right moment.
3. It stops at the end of the clip. You can replay it, watch the full video on YouTube, or make a clip of your own.

A clip link looks like this:

```
https://justthisbit.vercel.app/c/dQw4w9WgXcQ/90-132?n=watch%20his%20face
```

That is the video, the start and end in seconds, and an optional note.

## Use it on your phone or computer

The [install page](https://justthisbit.vercel.app/install) has the same steps with buttons to copy what you need.

### Android: share menu

1. Open the site in Chrome and tap **Install app**. You can also tap the **⋮** menu, then **Install app** or **Add to Home screen**.
2. In the YouTube app, tap **Share** on a video and pick **Just This Bit**. If it isn't in the list, tap **More**.
3. If you turned on YouTube's "Start at" switch, the start time is filled in for you. If not, it asks where you paused.

### iPhone: "Clip it" Shortcut

iPhones don't let web apps appear in the share sheet, so a free Shortcut does the job. It takes about two minutes to build:

1. Open the **Shortcuts** app, tap **+**, and name it **Clip it**.
2. In its settings, turn on **Show in Share Sheet** and let it accept **URLs** and **Text**.
3. Add the action **URL Encode** with **Shortcut Input** as its input.
4. Add the action **Text**. Type `https://justthisbit.vercel.app/?url=` and insert the **URL Encoded Text** variable right after it, with no space.
5. Add the action **Open URLs**.
6. In YouTube, tap **Share**, then **More**, and pick **Clip it**.

### Desktop: bookmarklet

1. On the [install page](https://justthisbit.vercel.app/install), drag **Clip this** to your bookmarks bar.
2. On any YouTube video, click it. The create page opens with the video and the current time filled in.

There is also a Chrome extension that adds a **Clip** button next to Like and Share on YouTube. It is loaded by hand for now (see below).

### Anywhere: paste a link

Go to the site and paste any YouTube link. Watch pages, `youtu.be`, Shorts, live replays, embeds and mobile links all work.

## Under the hood

- **Stateless links.** Everything a clip needs is in its URL. There is no database and nothing is stored on a server, so a link keeps working for as long as the video is up.
- **Official YouTube player.** Clips play in YouTube's own embedded player through the IFrame Player API. The app watches the playback time and pauses the player when it reaches the end of the clip. Nothing is ever drawn on top of the player.
- **No video is downloaded or re-hosted.** The app never touches the video file. Views count for the creator as usual.
- **Link previews.** Each clip page is rendered on the server with the video title and thumbnail (from YouTube's public oEmbed endpoint), so WhatsApp and iMessage show a proper preview.
- **When a video can't be embedded,** the viewer shows a card with a button that opens the video on YouTube at the clip's start, instead of a black box.
- **Zero running cost.** It runs on Vercel's free Hobby plan with no paid services, no accounts and no API keys.
- **Privacy.** The only analytics is Vercel Web Analytics, and the note and any shared text are stripped from tracked URLs before they are sent. Recent clips are kept in your browser only.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) with TypeScript in strict mode
- Tailwind CSS
- Zod for validating every URL param and form value
- YouTube IFrame Player API and oEmbed
- Vitest for unit tests, Playwright and axe-core for end to end and accessibility tests
- Vite to bundle the Chrome extension (Manifest V3)
- Hosted on Vercel, deployed on every push to `main`

## Running it locally

It is built and tested on Node.js 24.

```bash
git clone https://github.com/shritan-lab/justthisbit.git
cd justthisbit
npm install --legacy-peer-deps
npm run dev
```

Then open http://localhost:3000. No environment variables are needed.

Other commands:

| Command | What it does |
|---|---|
| `npm run check` | Typecheck, lint, unit tests and a production build |
| `npm run test` | Unit tests |
| `npm run test:e2e` | Builds the extension, then runs the Playwright tests |
| `npm run ext:build` | Builds the Chrome extension into `extension/dist` |

## Loading the Chrome extension

The extension isn't on the Chrome Web Store, so you load it yourself:

1. Run `npm run ext:build`.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and pick the `extension/dist` folder.
4. Open any YouTube video. A **Clip** button appears next to Like and Share.

Shortcuts while the panel is open: Alt+Shift+S sets the start, Alt+Shift+E sets the end, Alt+Shift+C copies the link. If the button doesn't show up, click the toolbar icon to open the same panel in a popup.

The extension only runs on `www.youtube.com`, asks for clipboard and active tab access, and makes no network requests.

## Testing

- **521 unit tests** (Vitest) across 22 files. They cover YouTube link parsing, time parsing and formatting, clip link building and validation, the share target, link previews, recent clips, analytics filtering and the extension's logic.
- **274 end to end tests** (Playwright). 130 run on a desktop browser, the same 130 run on a phone viewport, and 14 load the built extension into Chromium against a fake YouTube page.

The end to end tests swap YouTube's player for a fake one whose clock the test controls, so they run offline and give the same result every time. They check the create flow, link previews, stopping at the end, replay, seeking, embed errors, timeouts, broken links, error pages, and accessibility with axe-core on every page.

```bash
npm run test
npm run test:e2e
```

## License

[MIT](LICENSE)
