import { expect, test, type Page } from "@playwright/test";
import { endPanel, openClip, viewer } from "./support/clip-page";
import { openCreate } from "./support/create-page";
import { KNOWN_VIDEO } from "./support/fixtures";

// SPEC 7: a thrown error shows "Something broke" with Reload and a way back, never a blank page.
// Each test breaks one browser API that a component calls while it renders its effects, so a real
// component throws inside the real app. No test-only code ships in the app.

const ID = KNOWN_VIDEO.id;

async function expectErrorView(page: Page) {
  await expect(page.getByTestId("error-view")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Something broke.");
  await expect(page.getByRole("button", { name: "Reload" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Make a clip" })).toHaveAttribute("href", "/");
}

test("an error on the viewer shows the error page, not a blank screen", async ({ page }) => {
  // The viewer scrolls the end panel into view when the clip ends.
  await page.addInitScript(() => {
    Element.prototype.scrollIntoView = () => {
      throw new Error("e2e: forced viewer error");
    };
  });
  const mock = await openClip(page, `/c/${ID}/90-95`);
  await expect(viewer(page)).toHaveAttribute("data-player-status", "ready");
  await mock.viewerPlay();
  await page.clock.runFor(5400);

  await expectErrorView(page);
  await expect(endPanel(page)).toHaveCount(0);
});

test("an error on the create page shows the error page", async ({ page }) => {
  // The editor fetches the video title as soon as a video loads.
  await page.addInitScript(() => {
    const realFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      if (String(input instanceof Request ? input.url : input).includes("/api/video/")) {
        throw new Error("e2e: forced create page error");
      }
      return realFetch(input, init);
    };
  });
  await openCreate(page, `?v=${ID}&t=90`);
  await expectErrorView(page);
});

test("an error on /install shows the error page, and Reload reloads", async ({ page }) => {
  // The bookmarklet's javascript: address is set on the link after it mounts.
  await page.addInitScript(() => {
    const realSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name: string, value: string) {
      if (String(value).startsWith("javascript:")) throw new Error("e2e: forced install page error");
      return realSetAttribute.call(this, name, value);
    };
  });
  await page.goto("/install");
  await expectErrorView(page);

  const reloaded = page.waitForEvent("load");
  await page.getByRole("button", { name: "Reload" }).click();
  await reloaded;
  await expectErrorView(page);
});

test("the error page's create link goes to the create page", async ({ page }) => {
  await page.addInitScript(() => {
    if (location.pathname !== "/install") return;
    const realSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name: string, value: string) {
      if (String(value).startsWith("javascript:")) throw new Error("e2e: forced install page error");
      return realSetAttribute.call(this, name, value);
    };
  });
  await page.goto("/install");
  await expectErrorView(page);
  await page.getByRole("link", { name: "Make a clip" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("YouTube link")).toBeVisible();
});

test("unknown pages answer 404 with a not-found page", async ({ page, request }) => {
  const res = await request.get("/no-such-page");
  expect(res.status()).toBe(404);
  const html = await res.text();
  // Both messages are in the static HTML. An inline script picks one before the page paints.
  expect(html).toMatch(/<h1[^>]*>This page doesn(?:'|&#x27;)t exist<\/h1>/);
  expect(html).toMatch(/<meta name="robots" content="noindex"\/>/);

  for (const path of ["/no-such-page", "/some/deep/unknown/path", "/install/extra", "/cats"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.getByRole("heading", { level: 1 }), path).toHaveText("This page doesn't exist");
    await expect(page.getByRole("link", { name: "Make a clip" })).toHaveAttribute("href", "/");
    await expect(page).toHaveTitle("This page doesn't exist · Just This Bit");
  }
});

test("the not-found page shows one message even before JavaScript runs", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`/c/${ID}/132-90`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This clip link looks broken");
  await context.close();
});

test("the not-found page hydrates without errors", async ({ page }) => {
  const errors: string[] = [];
  // The 404 status itself is logged, and /_vercel/insights only exists on Vercel.
  const expected = (text: string) => text.includes("404") || text.includes("/_vercel/insights/");
  page.on("console", (msg) => msg.type() === "error" && !expected(msg.text()) && errors.push(msg.text()));
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page doesn't exist");
  await page.goto(`/c/${ID}/132-90`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This clip link looks broken");
  // Let hydration finish.
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});
