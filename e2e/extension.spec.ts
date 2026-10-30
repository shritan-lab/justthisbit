import AxeBuilder from "@axe-core/playwright";
import { existsSync } from "node:fs";
import path from "node:path";
import { chromium, expect, test as base, type BrowserContext, type Locator, type Page } from "@playwright/test";
import { routeFakeYouTube } from "./support/fake-youtube";

// Loads the built extension (npm run ext:build, which npm run test:e2e runs first) into Chromium
// and drives it on a fake youtube.com. Runs in the "extension" Playwright project only.

const EXTENSION_DIR = path.join(process.cwd(), "extension", "dist");
const SITE = "https://justthisbit.vercel.app";
const ID = "dQw4w9WgXcQ";
const ID2 = "UF8uR6Z6KLc";

// Fixture callbacks name Playwright's `use` as `provide`, so the React hooks lint rule leaves them alone.
const test = base.extend<{ context: BrowserContext; page: Page; extensionId: string }>({
  context: async ({}, provide, testInfo) => {
    if (!existsSync(path.join(EXTENSION_DIR, "manifest.json"))) {
      throw new Error("extension/dist is missing. Run `npm run ext:build` first.");
    }
    const context = await chromium.launchPersistentContext(testInfo.outputPath("profile"), {
      // The full Chromium build, which can load extensions headless.
      channel: "chromium",
      args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
      permissions: ["clipboard-read", "clipboard-write"],
      viewport: { width: 1600, height: 1000 },
    });
    await routeFakeYouTube(context);
    await provide(context);
    await context.close();
  },
  page: async ({ context }, provide) => {
    await provide(context.pages()[0] ?? (await context.newPage()));
  },
  extensionId: async ({ context }, provide) => {
    const page = await context.newPage();
    await page.goto("chrome://extensions");
    const id = await page.evaluate(async () => {
      const api = (globalThis as unknown as { chrome: { developerPrivate: { getExtensionsInfo(): Promise<{ id: string; name: string }[]> } } })
        .chrome.developerPrivate;
      const all = await api.getExtensionsInfo();
      return all.find((e) => e.name === "Just This Bit")?.id ?? "";
    });
    await page.close();
    expect(id).not.toBe("");
    await provide(id);
  },
});

const clipButtons = (page: Page) => page.locator("[data-jtb-clip-button]");
const clipButton = (page: Page) => page.getByRole("button", { name: "Clip this bit" });
const panel = (page: Page) => page.getByTestId("jtb-panel");
const startField = (scope: Page | Locator) => scope.getByLabel("Start", { exact: true });
const endField = (scope: Page | Locator) => scope.getByLabel("End", { exact: true });

async function setVideoTime(page: Page, seconds: number) {
  const now = await page.evaluate((s) => (window as unknown as { setVideoTime(s: number): number }).setVideoTime(s), seconds);
  expect(now).toBeCloseTo(seconds, 3);
}

async function readClipboard(page: Page): Promise<string> {
  return page.evaluate(() => navigator.clipboard.readText());
}

async function openWatch(page: Page, id = ID) {
  await page.goto(`https://www.youtube.com/watch?v=${id}`);
  await expect(clipButtons(page)).toHaveCount(1);
}

test.describe("Chrome extension on a YouTube watch page", () => {
  test("adds one Clip button in the action row, after Like and Share, never in the player", async ({ page }) => {
    await openWatch(page);
    const host = clipButtons(page);
    await expect(host).toHaveCount(1);
    expect(await host.evaluate((el) => el.parentElement?.id)).toBe("top-level-buttons-computed");
    expect(await host.evaluate((el) => el.previousElementSibling?.textContent)).toBe("Share");
    expect(await host.evaluate((el) => el.closest("#movie_player") === null)).toBe(true);

    // Still exactly one after YouTube-style churn and repeated navigation events.
    await page.evaluate(() => {
      for (let i = 0; i < 5; i++) document.dispatchEvent(new CustomEvent("yt-navigate-finish", { bubbles: true }));
      document.body.append(document.createElement("div"));
    });
    await page.waitForTimeout(400);
    await expect(clipButtons(page)).toHaveCount(1);
  });

  test("survives navigation to another video and re-renders without an event", async ({ page }) => {
    await openWatch(page);
    await page.evaluate((id) => (window as unknown as { fakeNavigate(id: string): void }).fakeNavigate(id), ID2);
    await expect(clipButtons(page)).toHaveCount(1);
    expect(await clipButtons(page).evaluate((el) => el.parentElement?.id)).toBe("top-level-buttons-computed");

    // A re-render with no yt-navigate-finish: only the MutationObserver sees it.
    await page.evaluate(() => (window as unknown as { fakeRerender(): void }).fakeRerender());
    await expect(clipButtons(page)).toHaveCount(1);
    await page.waitForTimeout(400);
    await expect(clipButtons(page)).toHaveCount(1);

    // The link is for the new video.
    await setVideoTime(page, 10);
    await clipButton(page).click();
    await expect(panel(page).getByTestId("jtb-link")).toHaveText(`${SITE}/c/${ID2}/10-40`);
  });

  test("opens the panel below the action row with start = now and end = start + 30s", async ({ page }) => {
    await openWatch(page);
    await setVideoTime(page, 83.4);
    await clipButton(page).click();

    await expect(panel(page)).toBeVisible();
    await expect(startField(page)).toHaveValue("1:23");
    await expect(endField(page)).toHaveValue("1:53");
    await expect(panel(page).getByTestId("jtb-length")).toHaveText("0:30 clip");
    await expect(panel(page)).toContainText("Alt+Shift+S");

    // In the page flow right after the top row, below the player, not over it.
    const host = page.locator("[data-jtb-clip-panel]");
    expect(await host.evaluate((el) => el.previousElementSibling?.id)).toBe("top-row");
    const player = await page.locator("#movie_player").boundingBox();
    const box = await panel(page).boundingBox();
    expect(player && box && box.y >= player.y + player.height).toBe(true);
    await expect(clipButton(page)).toHaveAttribute("aria-expanded", "true");

    await clipButton(page).click();
    await expect(panel(page)).toHaveCount(0);
  });

  test("Set to now reads the video time, chips set the end, and Copy link copies the right URL", async ({ page }) => {
    await openWatch(page);
    await setVideoTime(page, 5);
    await clipButton(page).click();

    await setVideoTime(page, 95.6);
    await page.getByRole("button", { name: "Set start to now" }).click();
    await expect(startField(page)).toHaveValue("1:35");
    await expect(endField(page)).toHaveValue("2:05");

    await setVideoTime(page, 130.2);
    await page.getByRole("button", { name: "Set end to now" }).click();
    await expect(endField(page)).toHaveValue("2:11");
    await expect(panel(page).getByTestId("jtb-length")).toHaveText("0:36 clip");

    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(await readClipboard(page)).toBe(`${SITE}/c/${ID}/95-131`);

    await page.getByRole("button", { name: "+1m" }).click();
    await expect(endField(page)).toHaveValue("2:35");
    await page.getByLabel("Note (optional)").fill("watch his face & laugh");
    const expected = `${SITE}/c/${ID}/95-155?n=watch%20his%20face%20%26%20laugh`;
    await expect(panel(page).getByRole("link", { name: "Open" })).toHaveAttribute("href", expected);
    await page.getByRole("button", { name: /Copy link|Copied/ }).click();
    await expect.poll(() => readClipboard(page)).toBe(expected);
  });

  test("shows the create page's validation messages and blocks copying", async ({ page }) => {
    await openWatch(page);
    await setVideoTime(page, 100);
    await clipButton(page).click();

    await endField(page).fill("1:00");
    await expect(panel(page)).toContainText("The end has to be after the start.");
    await expect(page.getByRole("button", { name: "Copy link" })).toBeDisabled();
    await expect(panel(page).getByTestId("jtb-length")).toHaveText("No clip yet");

    await endField(page).fill("2:00:00");
    await expect(panel(page)).toContainText("Clips can be up to 60 minutes long.");

    await startField(page).fill("soon");
    await expect(panel(page)).toContainText("Start time not understood. Try 1:30 or 90.");
  });

  test("keyboard shortcuts set start, end and copy, but not while typing", async ({ page }) => {
    await openWatch(page);
    await setVideoTime(page, 61);
    await page.locator("#owner").click();

    // Alt+Shift+S opens the panel if needed and sets the start.
    await page.keyboard.press("Alt+Shift+KeyS");
    await expect(startField(page)).toHaveValue("1:01");
    await setVideoTime(page, 70.5);
    await page.locator("#owner").click();
    await page.keyboard.press("Alt+Shift+KeyE");
    await expect(endField(page)).toHaveValue("1:11");
    await page.keyboard.press("Alt+Shift+KeyC");
    await expect.poll(() => readClipboard(page)).toBe(`${SITE}/c/${ID}/61-71`);

    // Typing in the note: the shortcut is ignored.
    await setVideoTime(page, 200);
    await page.getByLabel("Note (optional)").click();
    await page.keyboard.press("Alt+Shift+KeyS");
    await expect(startField(page)).toHaveValue("1:01");
  });

  test("navigating to another video closes the panel", async ({ page }) => {
    await openWatch(page);
    await clipButton(page).click();
    await expect(panel(page)).toBeVisible();
    await page.evaluate((id) => (window as unknown as { fakeNavigate(id: string): void }).fakeNavigate(id), ID2);
    await expect(panel(page)).toHaveCount(0);
    await expect(clipButtons(page)).toHaveCount(1);
  });

  test("does nothing on pages without a video", async ({ page }) => {
    await page.goto("https://www.youtube.com/feed/subscriptions");
    await page.waitForTimeout(500);
    await expect(clipButtons(page)).toHaveCount(0);
  });
});

test.describe("Chrome extension on YouTube Shorts", () => {
  test("puts Clip in the action bar and opens the panel beside the video, never over it", async ({ page }) => {
    await page.goto(`https://www.youtube.com/shorts/${ID}`);
    await expect(clipButtons(page)).toHaveCount(1);
    expect(await clipButtons(page).evaluate((el) => el.parentElement?.tagName.toLowerCase())).toBe("reel-action-bar-view-model");
    expect(await clipButtons(page).evaluate((el) => el.nextElementSibling?.tagName.toLowerCase())).toBe("pivot-button-view-model");

    await setVideoTime(page, 12);
    await clipButton(page).click();
    await expect(startField(page)).toHaveValue("0:12");

    const video = await page.locator("#shorts-player").boundingBox();
    const box = await panel(page).boundingBox();
    expect(video && box).toBeTruthy();
    const overlaps =
      box!.x < video!.x + video!.width && video!.x < box!.x + box!.width && box!.y < video!.y + video!.height && video!.y < box!.y + box!.height;
    expect(overlaps).toBe(false);

    await page.getByRole("button", { name: "Copy link" }).click();
    await expect.poll(() => readClipboard(page)).toBe(`${SITE}/c/${ID}/12-42`);
  });
});

test.describe("Chrome extension toolbar popup", () => {
  test("shows the same controls for the YouTube tab and reads its time", async ({ context, page, extensionId }) => {
    await openWatch(page);
    await setVideoTime(page, 42);
    const tabId = await (async () => {
      const probe = await context.newPage();
      await probe.goto(`chrome-extension://${extensionId}/popup.html`);
      // The probe is the active tab, so find the other one: the YouTube tab.
      const id = await probe.evaluate(async () => {
        const c = (globalThis as unknown as { chrome: { tabs: { query(q: object): Promise<{ id: number }[]>; getCurrent(): Promise<{ id: number }> } } }).chrome;
        const me = await c.tabs.getCurrent();
        return (await c.tabs.query({})).find((t) => t.id !== me.id)?.id ?? 0;
      });
      await probe.close();
      return id;
    })();

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html?tab=${tabId}`);
    await expect(startField(popup)).toHaveValue("0:42");
    await expect(endField(popup)).toHaveValue("1:12");
    await expect(popup.getByTestId("jtb-link")).toHaveText(`${SITE}/c/${ID}/42-72`);

    await setVideoTime(page, 50.5);
    await popup.getByRole("button", { name: "Set end to now" }).click();
    await expect(endField(popup)).toHaveValue("0:51");
    await popup.getByRole("button", { name: "Copy link" }).click();
    await expect.poll(() => popup.evaluate(() => navigator.clipboard.readText())).toBe(`${SITE}/c/${ID}/42-51`);
  });

  test("asks for a YouTube video on other tabs", async ({ extensionId, context }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(popup.getByTestId("jtb-popup-message")).toHaveText("Open a YouTube video, then click this button again.");
  });
});

test.describe("Chrome extension accessibility", () => {
  const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

  /** Controls inside our shadow roots smaller than 44 by 44 CSS pixels. */
  async function smallTargets(page: Page, hostSelector: string): Promise<string[]> {
    return page.evaluate((selector) => {
      const out: string[] = [];
      for (const host of document.querySelectorAll(selector)) {
        const root = host.shadowRoot;
        if (!root) continue;
        for (const el of root.querySelectorAll<HTMLElement>("a[href], button, input, textarea")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.width < 43.5 || r.height < 43.5) out.push(`${el.tagName} "${el.textContent?.trim()}" ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
      }
      return out;
    }, hostSelector);
  }

  test("the panel on a watch page passes axe and has 44px targets", async ({ page }) => {
    await openWatch(page);

    // The Clip button is drawn 36px tall to match YouTube's row, but taps 4px above and below it still hit it.
    const hits = await page.evaluate(() => {
      const root = document.querySelector("[data-jtb-clip-button]")!.shadowRoot!;
      const button = root.querySelector("button")!;
      const r = button.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const hit = (y: number) => button.contains(root.elementFromPoint(x, y));
      return { height: Math.round(r.height), above: hit(r.top - 3.9), below: hit(r.bottom + 3.9) };
    });
    expect(hits).toEqual({ height: 36, above: true, below: true });

    await clipButton(page).click();
    await expect(panel(page)).toBeVisible();
    const results = await new AxeBuilder({ page }).include("[data-jtb-clip-panel]").include("[data-jtb-clip-button]").withTags(TAGS).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    expect(await smallTargets(page, "[data-jtb-clip-panel]")).toEqual([]);
  });

  test("the Clip button and every panel control are reachable with the keyboard and show a focus ring", async ({ page }) => {
    await openWatch(page);
    // Tab from YouTube's Share button to Clip, and open the panel with Enter.
    await page.getByRole("button", { name: "Share" }).focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(panel(page)).toBeVisible();
    await page.getByRole("button", { name: "Share" }).focus();

    const reached: string[] = [];
    for (let i = 0; i < 16; i++) {
      await page.keyboard.press("Tab");
      const stop = await page.evaluate(() => {
        let el: Element | null = document.activeElement;
        while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
        if (!(el instanceof HTMLElement)) return "";
        // Only our own controls. YouTube's page draws its own focus styles.
        const root = el.getRootNode();
        if (!(root instanceof ShadowRoot) || !root.host.matches("[data-jtb-clip-button], [data-jtb-clip-panel]")) return "page";
        const style = getComputedStyle(el);
        const ring = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2;
        return `${ring ? "" : "NO RING: "}${el.id || el.textContent?.trim() || el.tagName}`;
      });
      reached.push(stop);
    }
    const all = reached.join("\n");
    expect(all).not.toContain("NO RING");
    for (const name of ["Clip", "jtb-start", "Set start to now", "jtb-end", "Set end to now", "+15s", "+2m", "jtb-note", "Copy link", "Open"]) {
      expect(all, name).toContain(name);
    }
  });

  test("the toolbar popup passes axe", async ({ extensionId, context }) => {
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(popup.getByTestId("jtb-popup-message")).toBeVisible();
    const results = await new AxeBuilder({ page: popup }).withTags(TAGS).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });
});
