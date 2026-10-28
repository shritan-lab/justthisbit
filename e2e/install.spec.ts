import { expect, test, type Page } from "@playwright/test";
import { buildBookmarklet } from "../lib/bookmarklet";
import { E2E_SITE_URL } from "./support/fixtures";

// SPEC 5.4 and 6.3.
const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

const section = (page: Page, id: "android" | "iphone" | "desktop") => page.getByTestId(`install-${id}`);

async function openSections(page: Page) {
  // Wait for device detection to run after hydration.
  await expect(page.locator("[data-device]")).not.toHaveAttribute("data-device", "unknown");
  return {
    android: await section(page, "android").evaluate((d) => (d as HTMLDetailsElement).open),
    iphone: await section(page, "iphone").evaluate((d) => (d as HTMLDetailsElement).open),
    desktop: await section(page, "desktop").evaluate((d) => (d as HTMLDetailsElement).open),
  };
}

test("home page footer links to /install", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("contentinfo").getByRole("link", { name: "Get it on your phone" });
  await expect(link).toHaveAttribute("href", "/install");
  await link.click();
  await expect(page).toHaveURL(/\/install$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Get it on your phone");
});

test("opens the section for this device", async ({ page }, testInfo) => {
  await page.goto("/install");
  const open = await openSections(page);
  if (testInfo.project.name === "mobile") {
    expect(open).toEqual({ android: true, iphone: false, desktop: false });
  } else {
    expect(open).toEqual({ android: false, iphone: false, desktop: true });
  }
});

test("sections open and close by hand", async ({ page }) => {
  await page.goto("/install");
  await openSections(page);
  await section(page, "iphone").locator("summary").click();
  await expect(section(page, "iphone")).toHaveAttribute("open", "");
  await section(page, "iphone").locator("summary").click();
  await expect(section(page, "iphone")).not.toHaveAttribute("open");
});

test.describe("on an iPhone", () => {
  test.use({ userAgent: IPHONE_UA });

  test("opens the Shortcut steps with the real site URL and the iCloud placeholder", async ({ page }) => {
    await page.goto("/install");
    expect(await openSections(page)).toEqual({ android: false, iphone: true, desktop: false });
    const iphone = section(page, "iphone");
    await expect(iphone.getByText(`${E2E_SITE_URL}/?url=`, { exact: true })).toBeVisible();
    await expect(iphone.getByText("URL Encode", { exact: true })).toBeVisible();
    await expect(iphone.getByText("Open URLs", { exact: true })).toBeVisible();
    await expect(page.getByTestId("shortcut-link-placeholder")).toBeVisible();
  });
});

test.describe("Android install button", () => {
  test("shows manual steps, then a real Install button once Chrome offers one", async ({ page }) => {
    await page.goto("/install");
    await openSections(page);
    const android = section(page, "android");
    if (!(await android.evaluate((d) => (d as HTMLDetailsElement).open))) await android.locator("summary").click();

    await expect(android.getByText("Install app", { exact: true })).toBeVisible();
    await expect(android.getByRole("button", { name: "Install app" })).toHaveCount(0);

    // Stand-in for Chrome's beforeinstallprompt.
    await page.evaluate(() => {
      const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & Record<string, unknown>;
      event.prompt = async () => {
        (window as unknown as Record<string, unknown>).__prompted = true;
      };
      event.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });
      window.dispatchEvent(event);
    });

    const button = android.getByRole("button", { name: "Install app" });
    await expect(button).toBeVisible();
    await button.click();
    expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__prompted)).toBe(true);
    await expect(android.getByRole("status")).toContainText("Just This Bit is installed.");
  });
});

test.describe("desktop bookmarklet", () => {
  test.skip(({ isMobile }) => isMobile, "Bookmarklets are for desktop browsers.");

  const ID = "UF8uR6Z6KLc";

  async function bookmarkletFromPage(page: Page): Promise<string> {
    await page.goto("/install");
    const link = page.getByTestId("bookmarklet");
    await expect(link).toHaveAttribute("href", /^javascript:/);
    await expect(link).toHaveText("▶ Clip this");
    await expect(link).toHaveAttribute("draggable", "true");
    return (await link.getAttribute("href"))!;
  }

  /** A stand-in YouTube page at `url`, with a main player video paused at `time`. */
  async function fakeYouTube(page: Page, url: string, time: number, playerId = "movie_player") {
    await page.context().route("https://www.youtube.com/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body:
          `<!doctype html><title>YouTube</title><video></video><div id="${playerId}"><video></video></div>` +
          `<script>Object.defineProperty(document.querySelectorAll("video")[1],"currentTime",{get:function(){return ${time}}})</script>`,
      }),
    );
    await page.goto(url);
  }

  async function runBookmarklet(page: Page, code: string) {
    const source = decodeURIComponent(code.slice("javascript:".length));
    await page.evaluate((src) => (0, eval)(src), source);
  }

  test("the link holds the bookmarklet built for the production origin", async ({ page }) => {
    const code = await bookmarkletFromPage(page);
    expect(code).toBe(buildBookmarklet(E2E_SITE_URL));
    await page.getByTestId("bookmarklet").click();
    await expect(page).toHaveURL(/\/install$/);
    await expect(page.getByText("Drag it to the bookmarks bar instead of clicking it here.")).toBeVisible();

    await page.getByText("Can't drag it?").click();
    await expect(page.getByTestId("bookmarklet-code")).toHaveValue(code);
  });

  for (const [kind, path, playerId] of [
    ["watch", `/watch?v=${ID}&si=abc`, "movie_player"],
    ["shorts", `/shorts/${ID}`, "shorts-player"],
    ["live", `/live/${ID}?si=abc`, "movie_player"],
  ] as const) {
    test(`on a YouTube ${kind} page it opens the create page at the current time`, async ({ page }) => {
      const code = await bookmarkletFromPage(page);
      await page.context().route(`${E2E_SITE_URL}/**`, (route) => route.fulfill({ body: "ok" }));
      await fakeYouTube(page, `https://www.youtube.com${path}`, 840.7, playerId);

      const popup = page.waitForEvent("popup");
      await runBookmarklet(page, code);
      expect((await popup).url()).toBe(`${E2E_SITE_URL}/?v=${ID}&t=840`);
    });
  }

  test("on a page that isn't a video it says so", async ({ page }) => {
    const code = await bookmarkletFromPage(page);
    await fakeYouTube(page, "https://www.youtube.com/feed/subscriptions", 0);
    const dialog = page.waitForEvent("dialog");
    void runBookmarklet(page, code);
    const d = await dialog;
    expect(d.message()).toBe("Open a YouTube video first");
    await d.dismiss();
  });
});
