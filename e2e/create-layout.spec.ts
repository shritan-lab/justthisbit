import { expect, test, type Page } from "@playwright/test";
import { allowClipboard, clipUrl, noteField, openCreate, recentClips } from "./support/create-page";
import { KNOWN_VIDEO } from "./support/fixtures";

const ID = KNOWN_VIDEO.id;
const MIN_TAP = 44;

// Phones run in the "mobile" project (touch, coarse pointer), the wide screen in "desktop".
const WIDTHS = [
  { width: 360, height: 780, project: "mobile" },
  { width: 390, height: 844, project: "mobile" },
  { width: 1280, height: 800, project: "desktop" },
] as const;

/** Every visible control on the page that is smaller than 44 x 44. */
async function smallTargets(page: Page) {
  return page.evaluate((min) => {
    const controls = document.querySelectorAll<HTMLElement>("main button, main a, main input, main textarea");
    const small: string[] = [];
    for (const el of controls) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue; // hidden
      if (box.width < min - 0.5 || box.height < min - 0.5) {
        small.push(`${el.tagName} "${(el.textContent || el.getAttribute("aria-label") || "").trim()}" ${box.width}x${box.height}`);
      }
    }
    return small;
  }, MIN_TAP);
}

for (const { width, height, project } of WIDTHS) {
  test(`create page at ${width}px: no horizontal scroll, every tap target at least 44px`, async ({ page }, info) => {
    test.skip(info.project.name !== project, `${width}px runs in the ${project} project`);
    await page.setViewportSize({ width, height });
    await allowClipboard(page);

    // Empty page first.
    await openCreate(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

    // Then the full editor with a long note, the output and a recent clip, which is the widest it gets.
    await page.goto(`/?v=${ID}&t=3723`);
    await noteField(page).fill("the dots connect 👀 ".repeat(7).trim());
    await expect(clipUrl(page)).toBeVisible();
    await page.getByRole("button", { name: "Copy", exact: true }).click();
    await expect(recentClips(page)).toBeVisible();
    await expect(page.getByTestId("video-title")).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(await smallTargets(page)).toEqual([]);
  });
}
