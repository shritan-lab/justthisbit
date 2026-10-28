import { expect, test, type Page } from "@playwright/test";
import { openClip } from "./support/clip-page";
import {
  allowClipboard,
  clipLength,
  clipUrl,
  editor,
  endField,
  noteField,
  openCreate,
  output,
  pasteField,
  readClipboard,
  recentClips,
  startField,
  waitForEditorReady,
  writeClipboard,
} from "./support/create-page";
import { E2E_SITE_URL, KNOWN_VIDEO } from "./support/fixtures";
import { PlayerState } from "./support/youtube-mock";

const ID = KNOWN_VIDEO.id;
const ANDROID_ID = "UF8uR6Z6KLc";
const ANDROID_SHARE_TEXT = `Check this out https://youtu.be/${ANDROID_ID}?si=abc&t=840`;

const PASTE_ERROR =
  "That doesn't look like a YouTube video link. Copy it from the Share button on YouTube and paste it here.";
const EMBED_WARNING =
  "This video can't play outside YouTube. Your link still works: your friend gets a button that opens YouTube at the right time.";

const button = (page: Page, name: string) => page.getByRole("button", { name, exact: true });
// Scoped to <main>: Next's route announcer is also role="alert".
const alerts = (page: Page) => page.getByRole("main").getByRole("alert");

test.describe("SPEC 8.2 create flow", () => {
  test("paste a URL with t=90, start shows 1:30, +30s sets end 2:00, the link is correct, copy works", async ({ page }) => {
    await allowClipboard(page);
    await openCreate(page);
    await expect(pasteField(page)).toBeFocused();

    await pasteField(page).fill(`https://www.youtube.com/watch?v=${ID}&t=90`);
    await expect(startField(page)).toHaveValue("1:30");

    await button(page, "+1m").click();
    await expect(endField(page)).toHaveValue("2:30");
    await button(page, "+30s").click();
    await expect(endField(page)).toHaveValue("2:00");
    await expect(button(page, "+30s")).toHaveAttribute("aria-pressed", "true");
    await expect(clipLength(page)).toHaveText("0:30 clip");

    const expected = `${E2E_SITE_URL}/c/${ID}/90-120`;
    await expect(clipUrl(page)).toHaveText(expected);

    await button(page, "Copy").click();
    await expect(button(page, "Copied")).toBeVisible();
    expect(await readClipboard(page)).toBe(expected);
    await expect(button(page, "Copy")).toBeVisible({ timeout: 5000 });
  });

  test("links use the production site URL, never the page's own origin", async ({ page }) => {
    await openCreate(page, `?v=${ID}&t=90`);
    const link = new URL((await clipUrl(page).textContent())!);
    expect(link.origin).toBe(E2E_SITE_URL);
    expect(link.origin).not.toBe(new URL(page.url()).origin);
    expect(link.href).not.toContain("localhost");
    await expect(output(page).getByRole("link", { name: "Open" })).toHaveAttribute("href", link.href);
  });

  test("defaults the end to start + 30s and cues the player at the start without autoplay", async ({ page }) => {
    const mock = await openCreate(page, `?v=${ID}&t=90`);
    await waitForEditorReady(page);
    await expect(startField(page)).toHaveValue("1:30");
    await expect(endField(page)).toHaveValue("2:00");
    await expect(clipLength(page)).toHaveText("0:30 clip");

    const iframe = editor(page).locator("iframe");
    await expect(iframe).toHaveAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    const snap = await mock.snapshot();
    expect(snap?.videoId).toBe(ID);
    expect(snap?.playerVars.start).toBe("90");
    expect(snap?.playerVars).not.toHaveProperty("autoplay");
    expect(snap?.playerVars).not.toHaveProperty("end");
    expect(snap?.state).toBe(PlayerState.UNSTARTED);
  });

  test("starts at 0:00 when the link has no time", async ({ page }) => {
    await openCreate(page);
    await pasteField(page).fill(`https://youtu.be/${ID}`);
    await expect(startField(page)).toHaveValue("0:00");
    await expect(endField(page)).toHaveValue("0:30");
    await expect(clipUrl(page)).toHaveText(`${E2E_SITE_URL}/c/${ID}/0-30`);
  });

  test("shows the video title and channel", async ({ page }) => {
    await openCreate(page, `?v=${ID}`);
    await expect(page.getByTestId("video-title")).toHaveText(`${KNOWN_VIDEO.title} · ${KNOWN_VIDEO.author}`);
  });
});

test.describe("pre-fill and pasting", () => {
  test("?v=&t= pre-fills the video and start, without focusing the field", async ({ page }) => {
    await openCreate(page, `?v=${ANDROID_ID}&t=840`);
    await expect(pasteField(page)).toHaveValue(`https://youtu.be/${ANDROID_ID}?t=840`);
    await expect(pasteField(page)).not.toBeFocused();
    await expect(startField(page)).toHaveValue("14:00");
    await expect(endField(page)).toHaveValue("14:30");
  });

  test("?url= with Android share text pre-fills start 14:00", async ({ page }) => {
    await openCreate(page, `?url=${encodeURIComponent(ANDROID_SHARE_TEXT)}`);
    await expect(pasteField(page)).toHaveValue(ANDROID_SHARE_TEXT);
    await expect(startField(page)).toHaveValue("14:00");
    await expect(clipUrl(page)).toHaveText(`${E2E_SITE_URL}/c/${ANDROID_ID}/840-870`);
  });

  test("pasting Android share text into the field pre-fills start 14:00", async ({ page }) => {
    await allowClipboard(page);
    await openCreate(page);
    await writeClipboard(page, ANDROID_SHARE_TEXT);
    await pasteField(page).focus();
    await page.keyboard.press("ControlOrMeta+V");
    await expect(pasteField(page)).toHaveValue(ANDROID_SHARE_TEXT);
    await expect(startField(page)).toHaveValue("14:00");
    await expect(endField(page)).toHaveValue("14:30");
    await expect(alerts(page)).toHaveCount(0);
  });

  test("the Paste button reads Android share text from the clipboard", async ({ page }) => {
    await allowClipboard(page);
    await openCreate(page);
    await writeClipboard(page, ANDROID_SHARE_TEXT);
    await button(page, "Paste").click();
    await expect(pasteField(page)).toHaveValue(ANDROID_SHARE_TEXT);
    await expect(startField(page)).toHaveValue("14:00");
  });

  test("the Paste button is hidden when the browser cannot read the clipboard", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Clipboard.prototype, "readText", { configurable: true, value: undefined });
    });
    await openCreate(page);
    await expect(pasteField(page)).toBeVisible();
    await expect(button(page, "Paste")).toHaveCount(0);
  });

  test("an invalid paste shows a clear error and no editor", async ({ page }) => {
    await openCreate(page);
    for (const junk of [
      "just some words, no link",
      "https://www.youtube.com/playlist?list=PL590L5WQmH8fJ54F369BLDSqIwcs-TCfs",
      "https://www.youtube.com/@SomeChannel",
      "https://vimeo.com/123456",
    ]) {
      await pasteField(page).fill(junk);
      await expect(alerts(page)).toHaveText(PASTE_ERROR);
      await expect(pasteField(page)).toHaveAttribute("aria-invalid", "true");
      await expect(editor(page)).toHaveCount(0);
      await expect(clipUrl(page)).toHaveCount(0);
    }

    // Fixing it clears the error.
    await pasteField(page).fill(`https://youtu.be/${ID}?t=90`);
    await expect(alerts(page)).toHaveCount(0);
    await expect(startField(page)).toHaveValue("1:30");
  });

  test("an invalid ?url= shows the error straight away", async ({ page }) => {
    await openCreate(page, `?url=${encodeURIComponent("https://example.com/not-a-video")}`);
    await expect(alerts(page)).toHaveText(PASTE_ERROR);
    await expect(editor(page)).toHaveCount(0);
  });

  test("our own clip link can be pasted to re-edit it", async ({ page }) => {
    await openCreate(page);
    await pasteField(page).fill(`${E2E_SITE_URL}/c/${ID}/90-132?n=hi`);
    await expect(startField(page)).toHaveValue("1:30");
  });
});

test.describe("editor", () => {
  test("nudges move the times, and the end follows the start until it is set by hand", async ({ page }) => {
    await openCreate(page, `?v=${ID}&t=90`);
    await page.getByRole("button", { name: "Start forward 5 seconds" }).click();
    await expect(startField(page)).toHaveValue("1:35");
    await expect(endField(page)).toHaveValue("2:05");

    await page.getByRole("button", { name: "Start back 1 second" }).click();
    await expect(startField(page)).toHaveValue("1:34");
    await expect(endField(page)).toHaveValue("2:04");

    await page.getByRole("button", { name: "End back 5 seconds" }).click();
    await expect(endField(page)).toHaveValue("1:59");

    // The end was set by hand, so it stays put now.
    await page.getByRole("button", { name: "Start forward 1 second" }).click();
    await expect(startField(page)).toHaveValue("1:35");
    await expect(endField(page)).toHaveValue("1:59");
    await expect(clipLength(page)).toHaveText("0:24 clip");
    await expect(clipUrl(page)).toHaveText(`${E2E_SITE_URL}/c/${ID}/95-119`);
  });

  test("start cannot be nudged below zero", async ({ page }) => {
    await openCreate(page, `?v=${ID}&t=3`);
    await page.getByRole("button", { name: "Start back 5 seconds" }).click();
    await expect(startField(page)).toHaveValue("0:00");
    await expect(page.getByRole("button", { name: "Start back 1 second" })).toBeDisabled();
  });

  test("time fields accept any format and tidy up on blur", async ({ page }) => {
    await openCreate(page, `?v=${ID}`);
    await startField(page).fill("90");
    await expect(endField(page)).toHaveValue("2:00");
    await endField(page).fill("2m30s");
    await expect(clipLength(page)).toHaveText("1:00 clip");
    await noteField(page).focus();
    await expect(startField(page)).toHaveValue("1:30");
    await expect(endField(page)).toHaveValue("2:30");
    await expect(clipUrl(page)).toHaveText(`${E2E_SITE_URL}/c/${ID}/90-150`);
  });

  test("Set to now reads the player time (start rounded down, end rounded up)", async ({ page }) => {
    const mock = await openCreate(page, `?v=${ID}&t=90`);
    await waitForEditorReady(page);
    await mock.viewerSeek(100.6);
    await button(page, "Set start to now").click();
    await expect(startField(page)).toHaveValue("1:40");
    await mock.viewerSeek(125.2);
    await button(page, "Set end to now").click();
    await expect(endField(page)).toHaveValue("2:06");
    await expect(clipUrl(page)).toHaveText(`${E2E_SITE_URL}/c/${ID}/100-126`);
  });

  test("shows validation messages and hides the link for bad times", async ({ page }) => {
    await openCreate(page, `?v=${ID}&t=90`);

    await endField(page).fill("1:00");
    await expect(alerts(page)).toHaveText("The end has to be after the start.");
    await expect(clipLength(page)).toHaveText("No clip yet");
    await expect(clipUrl(page)).toHaveCount(0);
    await expect(button(page, "Preview")).toBeDisabled();

    await endField(page).fill("1:30");
    await expect(alerts(page)).toHaveText("The end has to be after the start.");

    await endField(page).fill("1:01:31");
    await expect(alerts(page)).toHaveText("Clips can be up to 60 minutes long.");
    await expect(clipUrl(page)).toHaveCount(0);

    await endField(page).fill("1:01:30");
    await expect(alerts(page)).toHaveCount(0);
    await expect(clipLength(page)).toHaveText("1:00:00 clip");

    await startField(page).fill("soon");
    await expect(alerts(page)).toHaveText("Start time not understood. Try 1:30 or 90.");
    await expect(startField(page)).toHaveAttribute("aria-invalid", "true");
    await expect(clipUrl(page)).toHaveCount(0);
  });
});

test.describe("note and output", () => {
  test("the note goes into the link, WhatsApp text and Open link", async ({ page }) => {
    await openCreate(page, `?v=${ID}&t=90`);
    const note = "watch his face & then #2? 😂";
    await noteField(page).fill(note);
    await expect(page.getByTestId("note-count")).toHaveText(`${Array.from(note).length}/140`);

    const expected = `${E2E_SITE_URL}/c/${ID}/90-120?n=${encodeURIComponent(note)}`;
    await expect(clipUrl(page)).toHaveText(expected);
    await expect(output(page).getByRole("link", { name: "Open" })).toHaveAttribute("href", expected);
    const wa = output(page).getByRole("link", { name: "WhatsApp" });
    await expect(wa).toHaveAttribute("href", `https://wa.me/?text=${encodeURIComponent(`${note}\n${expected}`)}`);
  });

  test("the note stops at 140 characters, counting an emoji as one", async ({ page }) => {
    await openCreate(page, `?v=${ID}&t=90`);
    await noteField(page).fill("👀".repeat(3));
    await expect(page.getByTestId("note-count")).toHaveText("3/140");
    await noteField(page).fill("a".repeat(150));
    await expect(noteField(page)).toHaveValue("a".repeat(140));
    await expect(page.getByTestId("note-count")).toHaveText("140/140");
    await expect(clipUrl(page)).toContainText(`?n=${"a".repeat(140)}`);
  });

  test("Share sends title, note and link to the share sheet", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __shared: unknown[] };
      w.__shared = [];
      Object.defineProperty(Navigator.prototype, "share", {
        configurable: true,
        value: (data: unknown) => {
          w.__shared.push(data);
          return Promise.resolve();
        },
      });
    });
    await openCreate(page, `?v=${ID}&t=90`);
    await expect(page.getByTestId("video-title")).toBeVisible();
    await noteField(page).fill("the dots connect 👀");
    await button(page, "Share").click();
    const shared = await page.evaluate(() => (window as unknown as { __shared: unknown[] }).__shared);
    expect(shared).toEqual([
      {
        title: `▶ 0:30 clip · ${KNOWN_VIDEO.title}`,
        text: "the dots connect 👀",
        url: `${E2E_SITE_URL}/c/${ID}/90-120?n=${encodeURIComponent("the dots connect 👀")}`,
      },
    ]);
  });

  test("Share is hidden when the browser has no share sheet", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, "share", { configurable: true, value: undefined });
    });
    await openCreate(page, `?v=${ID}&t=90`);
    await expect(output(page).getByRole("link", { name: "WhatsApp" })).toBeVisible();
    await expect(button(page, "Share")).toHaveCount(0);
  });

  test("Copy falls back to a hidden textarea when the Clipboard API is missing", async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __copied: string[] };
      w.__copied = [];
      Object.defineProperty(Clipboard.prototype, "writeText", { configurable: true, value: undefined });
      document.execCommand = (command: string) => {
        const el = document.activeElement;
        if (command === "copy" && el instanceof HTMLTextAreaElement) w.__copied.push(el.value);
        return command === "copy";
      };
    });
    await openCreate(page, `?v=${ID}&t=90`);
    await button(page, "Copy").click();
    await expect(button(page, "Copied")).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __copied: string[] }).__copied)).toEqual([
      `${E2E_SITE_URL}/c/${ID}/90-120`,
    ]);
  });
});

test.describe("player errors", () => {
  test("an embed-blocked video (error 150) shows the warning but still produces a link", async ({ page }) => {
    await allowClipboard(page);
    await openCreate(page, "", { errorCode: 150 });
    await pasteField(page).fill(`https://www.youtube.com/watch?v=${ID}&t=90`);

    const warning = page.getByTestId("player-warning");
    await expect(warning).toContainText(EMBED_WARNING);
    await expect(editor(page)).toHaveAttribute("data-player-status", "error");
    await expect(page.getByTestId("player-frame")).toBeHidden();
    await expect(page.locator("iframe")).toHaveCount(0);

    // Link creation stays allowed.
    const expected = `${E2E_SITE_URL}/c/${ID}/90-120`;
    await expect(clipUrl(page)).toHaveText(expected);
    await button(page, "+1m").click();
    await expect(clipUrl(page)).toHaveText(`${E2E_SITE_URL}/c/${ID}/90-150`);
    await button(page, "Copy").click();
    expect(await readClipboard(page)).toBe(`${E2E_SITE_URL}/c/${ID}/90-150`);
    await expect(button(page, "Preview")).toBeDisabled();
    await expect(button(page, "Set start to now")).toBeDisabled();
  });

  for (const code of [101, 153]) {
    test(`error ${code} shows the same embed warning`, async ({ page }) => {
      await openCreate(page, `?v=${ID}&t=90`, { errorCode: code });
      await expect(page.getByTestId("player-warning")).toContainText(EMBED_WARNING);
      await expect(clipUrl(page)).toBeVisible();
    });
  }

  test("other errors say the preview can't load and still produce a link", async ({ page }) => {
    await openCreate(page, `?v=${ID}&t=90`, { errorCode: 100 });
    const warning = page.getByTestId("player-warning");
    await expect(warning).toContainText("The preview can't load.");
    await expect(warning).not.toContainText("outside YouTube");
    await expect(clipUrl(page)).toHaveText(`${E2E_SITE_URL}/c/${ID}/90-120`);
  });
});

test.describe("Preview", () => {
  test("seeks to start, plays, and pauses at end", async ({ page }) => {
    const mock = await openClip(page, `/?v=${ID}&t=90`);
    await waitForEditorReady(page);
    await button(page, "Preview").click();
    expect(await mock.calls()).toEqual([
      { method: "seekTo", args: [90, true] },
      { method: "playVideo", args: [] },
    ]);

    await page.clock.runFor(29_000);
    expect(await mock.state()).toBe(PlayerState.PLAYING);
    await page.clock.runFor(1_200);
    expect(await mock.state()).toBe(PlayerState.PAUSED);
    const stoppedAt = await mock.time();
    expect(stoppedAt).toBeGreaterThanOrEqual(120);
    expect(stoppedAt).toBeLessThanOrEqual(120.25);
  });

  test("uses the latest end when the sender changes it", async ({ page }) => {
    const mock = await openClip(page, `/?v=${ID}&t=90`);
    await waitForEditorReady(page);
    await button(page, "+15s").click();
    await button(page, "Preview").click();
    await page.clock.runFor(15_400);
    expect(await mock.state()).toBe(PlayerState.PAUSED);
    expect(await mock.time()).toBeLessThanOrEqual(105.25);
  });

  test("playing on YouTube's own controls is not stopped at the end", async ({ page }) => {
    const mock = await openClip(page, `/?v=${ID}&t=90`);
    await waitForEditorReady(page);
    await mock.viewerPlay();
    await page.clock.runFor(35_000);
    expect(await mock.state()).toBe(PlayerState.PLAYING);
    expect(await mock.calls()).toEqual([]);
  });
});

test.describe("keyboard shortcuts", () => {
  test.skip(({ isMobile }) => isMobile, "Shortcuts are for desktop keyboards");

  test("I sets the start, O sets the end, P previews, and typing in fields is ignored", async ({ page }) => {
    const mock = await openCreate(page, `?v=${ID}&t=90`);
    await waitForEditorReady(page);
    await page.getByRole("heading", { level: 1 }).click();

    await mock.viewerSeek(100);
    await page.keyboard.press("i");
    await expect(startField(page)).toHaveValue("1:40");

    await mock.viewerSeek(130);
    await page.keyboard.press("o");
    await expect(endField(page)).toHaveValue("2:10");

    await page.keyboard.press("p");
    expect(await mock.calls()).toEqual([
      { method: "seekTo", args: [100, true] },
      { method: "playVideo", args: [] },
    ]);

    // Typing the same letters in the note changes nothing else.
    await noteField(page).fill("");
    await noteField(page).pressSequentially("iop");
    await expect(noteField(page)).toHaveValue("iop");
    await expect(startField(page)).toHaveValue("1:40");
    await expect(endField(page)).toHaveValue("2:10");
    expect((await mock.calls()).length).toBe(2);
  });
});

test.describe("recent clips", () => {
  test("are saved when a link is used, survive a reload, and can be cleared", async ({ page }) => {
    await allowClipboard(page);
    await openCreate(page, `?v=${ID}&t=90`);
    await expect(recentClips(page)).toHaveCount(0);
    await expect(page.getByTestId("video-title")).toBeVisible();

    await button(page, "Copy").click();
    const list = recentClips(page).getByTestId("recent-clip");
    await expect(list).toHaveCount(1);
    await expect(list.first()).toContainText(KNOWN_VIDEO.title);
    await expect(list.first()).toContainText("1:30 to 2:00");

    await noteField(page).fill("the dots connect 👀");
    await button(page, "Copy").click();
    await expect(list).toHaveCount(2);
    await expect(list.first()).toContainText("the dots connect 👀");

    await page.goto("/");
    await expect(list).toHaveCount(2);
    const expected = `${E2E_SITE_URL}/c/${ID}/90-120?n=${encodeURIComponent("the dots connect 👀")}`;
    await expect(list.first().getByRole("link", { name: "Open" })).toHaveAttribute("href", expected);
    await list.first().getByRole("button", { name: /^Copy link/ }).click();
    expect(await readClipboard(page)).toBe(expected);

    await button(page, "Clear all").click();
    await expect(recentClips(page)).toHaveCount(0);
    await page.reload();
    await expect(pasteField(page)).toBeVisible();
    await expect(recentClips(page)).toHaveCount(0);
  });

  test("ignores junk in storage", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "jtb:recent-clips:v1",
        JSON.stringify([
          { url: "javascript:alert(1)", title: "evil", start: 0, end: 1 },
          { url: "https://justthisbit.vercel.app/c/dQw4w9WgXcQ/1-2", title: "ok", start: 1, end: 2 },
        ]),
      );
    });
    await openCreate(page);
    const list = recentClips(page).getByTestId("recent-clip");
    await expect(list).toHaveCount(1);
    await expect(list.first()).toContainText("ok");
  });

  test("the page works when localStorage is blocked", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new DOMException("The operation is insecure.", "SecurityError");
        },
      });
    });
    await allowClipboard(page);
    await openCreate(page);
    await pasteField(page).fill(`https://youtu.be/${ID}?t=90`);
    await expect(clipUrl(page)).toHaveText(`${E2E_SITE_URL}/c/${ID}/90-120`);
    await button(page, "Copy").click();
    expect(await readClipboard(page)).toBe(`${E2E_SITE_URL}/c/${ID}/90-120`);
    // Kept in memory for this visit.
    await expect(recentClips(page).getByTestId("recent-clip")).toHaveCount(1);
    expect(errors).toEqual([]);
  });
});

test.describe("video title route", () => {
  test("answers with the title for a known video", async ({ request }) => {
    const res = await request.get(`/api/video/${ID}`);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ title: KNOWN_VIDEO.title, authorName: KNOWN_VIDEO.author });
  });

  test("answers {} for an unknown video and 400 for a bad id", async ({ request }) => {
    const unknown = await request.get(`/api/video/aaaaaaaaaaa`);
    expect(unknown.status()).toBe(200);
    expect(await unknown.json()).toEqual({});
    const bad = await request.get(`/api/video/nope`);
    expect(bad.status()).toBe(400);
  });
});
