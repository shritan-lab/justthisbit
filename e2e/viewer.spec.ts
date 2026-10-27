import { expect, test } from "@playwright/test";
import { getSiteUrl } from "../lib/site";
import { openClip, viewer } from "./support/clip-page";
import {
  IMESSAGE_UA,
  KNOWN_VIDEO,
  UNKNOWN_VIDEO_ID,
  WHATSAPP_UA,
  headOf,
  metaContent,
  titleTag,
} from "./support/fixtures";

const ID = KNOWN_VIDEO.id;
const SITE_URL = getSiteUrl(); // the e2e server runs without VERCEL_PROJECT_PRODUCTION_URL

const NOTE = "watch his face 😂 & then laugh";
const NOTE_PATH = `/c/${ID}/90-132?n=${encodeURIComponent(NOTE)}`;

test.describe("link preview metadata (server HTML)", () => {
  for (const [name, ua] of [
    ["WhatsApp", WHATSAPP_UA],
    ["iMessage", IMESSAGE_UA],
  ] as const) {
    test(`${name} gets every tag in <head>`, async ({ request }) => {
      const res = await request.get(`/c/${ID}/90-132`, { headers: { "user-agent": ua } });
      expect(res.status()).toBe(200);
      const head = headOf(await res.text());

      const title = `▶ 0:42 clip · ${KNOWN_VIDEO.title}`;
      const description = `From 1:30 to 2:12 of "${KNOWN_VIDEO.title}" by ${KNOWN_VIDEO.author}`;
      expect(titleTag(head)).toBe(title);
      expect(metaContent(head, "description")).toBe(description);
      expect(metaContent(head, "og:title")).toBe(title);
      expect(metaContent(head, "og:description")).toBe(description);
      expect(metaContent(head, "og:image")).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
      expect(metaContent(head, "og:image:width")).toBe("480");
      expect(metaContent(head, "og:image:height")).toBe("360");
      expect(metaContent(head, "og:type")).toBe("video.other");
      expect(metaContent(head, "og:url")).toBe(`${SITE_URL}/c/${ID}/90-132`);
      expect(metaContent(head, "twitter:card")).toBe("summary_large_image");
      expect(metaContent(head, "robots")).toBe("noindex");
    });
  }

  test("og:url and og:image are absolute", async ({ request }) => {
    const html = await (await request.get(NOTE_PATH, { headers: { "user-agent": WHATSAPP_UA } })).text();
    for (const key of ["og:url", "og:image"]) {
      const value = metaContent(html, key)!;
      expect(new URL(value).protocol).toMatch(/^https?:$/);
    }
    expect(metaContent(html, "og:url")).toBe(`${SITE_URL}${NOTE_PATH}`);
  });

  test("the note (emoji and &) is the description", async ({ request }) => {
    const head = headOf(await (await request.get(NOTE_PATH, { headers: { "user-agent": WHATSAPP_UA } })).text());
    expect(metaContent(head, "description")).toBe(NOTE);
    expect(metaContent(head, "og:description")).toBe(NOTE);
  });

  test("falls back when oEmbed has no title (private or embed-disabled video)", async ({ request }) => {
    const head = headOf(
      await (await request.get(`/c/${UNKNOWN_VIDEO_ID}/90-132`, { headers: { "user-agent": WHATSAPP_UA } })).text(),
    );
    expect(titleTag(head)).toBe("▶ 0:42 YouTube clip");
    expect(metaContent(head, "og:title")).toBe("▶ 0:42 YouTube clip");
    expect(metaContent(head, "og:description")).toBe("From 1:30 to 2:12 of a YouTube video");
    expect(metaContent(head, "og:image")).toBe(`https://i.ytimg.com/vi/${UNKNOWN_VIDEO_ID}/hqdefault.jpg`);
  });

  test("a normal browser gets the same title and og tags", async ({ page }) => {
    await openClip(page, `/c/${ID}/90-132`);
    await expect(page).toHaveTitle(`▶ 0:42 clip · ${KNOWN_VIDEO.title}`);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      `▶ 0:42 clip · ${KNOWN_VIDEO.title}`,
    );
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      "content",
      `From 1:30 to 2:12 of "${KNOWN_VIDEO.title}" by ${KNOWN_VIDEO.author}`,
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`,
    );
  });
});

test.describe("layout", () => {
  test("note headline, clip line, player, then source and create link", async ({ page }) => {
    await openClip(page, NOTE_PATH);
    const root = viewer(page);
    await expect(root.getByRole("heading", { level: 1 })).toHaveText(NOTE);
    await expect(root.getByText("0:42 clip · starts at 1:30")).toBeVisible();
    await expect(page.getByTestId("video-source")).toHaveText(`From ${KNOWN_VIDEO.title} · ${KNOWN_VIDEO.author}`);
    await expect(root.getByRole("link", { name: "Make your own clip" })).toHaveAttribute("href", "/");

    const box = (await page.getByTestId("player-frame").boundingBox())!;
    expect(box.width / box.height).toBeCloseTo(16 / 9, 1);

    // Order on the page: headline, clip line, player, source.
    const y = async (testIdOrText: ReturnType<typeof page.locator>) => (await testIdOrText.boundingBox())!.y;
    const h1 = await y(root.getByRole("heading", { level: 1 }));
    const line = await y(root.getByText("0:42 clip · starts at 1:30"));
    const player = await y(page.getByTestId("player-frame"));
    const source = await y(page.getByTestId("video-source"));
    expect(h1).toBeLessThan(line);
    expect(line).toBeLessThan(player);
    expect(player).toBeLessThan(source);
  });

  test("without a note, the clip line is the headline", async ({ page }) => {
    await openClip(page, `/c/${ID}/90-132`);
    await expect(viewer(page).getByRole("heading", { level: 1 })).toHaveText("0:42 clip · starts at 1:30");
  });

  test("the note renders as plain text", async ({ page }) => {
    const note = '<b>bold</b> <img src=x onerror="window.__xss=1">';
    await openClip(page, `/c/${ID}/90-132?n=${encodeURIComponent(note)}`);
    await expect(viewer(page).getByRole("heading", { level: 1 })).toHaveText(note);
    expect(await page.evaluate(() => (window as Window & { __xss?: number }).__xss)).toBeUndefined();
  });

  test("no horizontal scroll", async ({ page }) => {
    await openClip(page, NOTE_PATH);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
