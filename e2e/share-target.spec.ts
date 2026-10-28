import { expect, test, type Page } from "@playwright/test";
import { endField, openCreate, pasteField, startField } from "./support/create-page";

// SPEC 5.3 and 8.2: Android share sheet data arrives at /share as title, text or url.
const ID = "UF8uR6Z6KLc";
const ANDROID_SHARE_TEXT = `Check this out https://youtu.be/${ID}?si=abc&t=840`;
const PASTE_ERROR =
  "That doesn't look like a YouTube video link. Copy it from the Share button on YouTube and paste it here.";

const share = (params: Record<string, string>) => `share?${new URLSearchParams(params).toString()}`;
const alerts = (page: Page) => page.getByRole("main").getByRole("alert");

function pathAndQuery(page: Page): string {
  const url = new URL(page.url());
  return url.pathname + url.search;
}

test.describe("/share", () => {
  test("Android text with words around the link opens the create page at 14:00", async ({ page }) => {
    await openCreate(page, share({ text: ANDROID_SHARE_TEXT }));
    await expect(page).toHaveURL(/\/\?v=/);
    expect(pathAndQuery(page)).toBe(`/?v=${ID}&t=840`);
    await expect(pasteField(page)).toHaveValue(`https://youtu.be/${ID}?t=840`);
    await expect(startField(page)).toHaveValue("14:00");
    await expect(endField(page)).toHaveValue("14:30");
  });

  test("link in url", async ({ page }) => {
    await openCreate(page, share({ url: `https://www.youtube.com/watch?v=${ID}&t=90s&si=xyz` }));
    await expect(page).toHaveURL(/\/\?v=/);
    expect(pathAndQuery(page)).toBe(`/?v=${ID}&t=90`);
    await expect(startField(page)).toHaveValue("1:30");
  });

  test("link in title, with a plain video title in text", async ({ page }) => {
    await openCreate(page, share({ title: `Watch https://youtube.com/shorts/${ID}?si=q`, text: "Funny video" }));
    await expect(page).toHaveURL(/\/\?v=/);
    expect(pathAndQuery(page)).toBe(`/?v=${ID}`);
    await expect(startField(page)).toHaveValue("0:00");
  });

  test("empty share opens the plain create page", async ({ page }) => {
    await openCreate(page, "share");
    await expect(page).toHaveURL(/\/$/);
    expect(pathAndQuery(page)).toBe("/");
    await expect(pasteField(page)).toHaveValue("");
    await expect(alerts(page)).toHaveCount(0);
  });

  test("junk text lands on the create page with the raw text and the error", async ({ page }) => {
    const junk = "lol you have to see this one";
    await openCreate(page, share({ text: junk, title: "Some title" }));
    await expect(page).toHaveURL(/\/\?url=/);
    expect(new URL(page.url()).searchParams.get("url")).toBe(junk);
    await expect(pasteField(page)).toHaveValue(junk);
    await expect(alerts(page)).toHaveText(PASTE_ERROR);
  });

  test("redirects with 303 and no caching", async ({ request }) => {
    const res = await request.get(`/${share({ text: ANDROID_SHARE_TEXT })}`, { maxRedirects: 0 });
    expect(res.status()).toBe(303);
    expect(new URL(res.headers()["location"]!, "http://x").pathname).toBe("/");
    expect(new URL(res.headers()["location"]!, "http://x").search).toBe(`?v=${ID}&t=840`);
    expect(res.headers()["cache-control"]).toContain("no-store");
  });
});
