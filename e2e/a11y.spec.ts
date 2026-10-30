import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { endPanel, fallbackCard, openClip, viewer } from "./support/clip-page";
import { allowClipboard, openCreate, output, recentClips, waitForEditorReady } from "./support/create-page";
import { KNOWN_VIDEO } from "./support/fixtures";

// SPEC 7 accessibility: WCAG 2.1 AA (axe-core) and 44px tap targets (CLAUDE.md) on every page.
// The YouTube iframe is a stand-in in these tests, so axe skips it.

const ID = KNOWN_VIDEO.id;
const MIN_TARGET = 44;

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .exclude("iframe")
    .analyze();
  const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(summary).toEqual([]);
}

/** Every visible control is at least 44 by 44 CSS pixels. */
async function expectTapTargets(page: Page) {
  const small = await page.evaluate((min) => {
    const controls = document.querySelectorAll<HTMLElement>(
      "a[href], button, input, textarea, select, summary, [role=button], [tabindex]:not([tabindex='-1'])",
    );
    const out: string[] = [];
    for (const el of controls) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || getComputedStyle(el).visibility === "hidden") continue;
      // Half a pixel of slack for subpixel layout.
      if (rect.width < min - 0.5 || rect.height < min - 0.5) {
        const name = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40);
        out.push(`${el.tagName.toLowerCase()} "${name}" ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      }
    }
    return out;
  }, MIN_TARGET);
  expect(small).toEqual([]);
}

/**
 * `text-base` is the 16px font size. It must never set a color (it did once, through a color
 * token named "base", and made text near-black on the dark background).
 */
async function expectNoDarkText(page: Page) {
  const dark = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((el) => el.getClientRects().length > 0 && el.closest("[aria-hidden=true]") === null)
      .filter((el) => [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim() !== ""))
      .filter((el) => getComputedStyle(el).color === "rgb(8, 8, 8)" && !el.closest(".bg-accent"))
      .map((el) => el.textContent!.trim().slice(0, 40)),
  );
  expect(dark).toEqual([]);
}

async function check(page: Page) {
  // Let CSS transitions (buttons fading in from disabled) finish first.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => null))));
  await expectNoAxeViolations(page);
  await expectTapTargets(page);
  await expectNoDarkText(page);
}

test.describe("accessibility", () => {
  test("create page, empty", async ({ page }) => {
    await openCreate(page);
    await expect(page.getByLabel("YouTube link")).toBeVisible();
    await check(page);
  });

  test("create page, invalid link", async ({ page }) => {
    await openCreate(page);
    await page.getByLabel("YouTube link").fill("not a link");
    await expect(page.locator("#paste-error")).toBeVisible();
    await check(page);
  });

  test("create page with the editor, link and recent clips", async ({ page }) => {
    await allowClipboard(page);
    await openCreate(page, `?v=${ID}&t=90`);
    await waitForEditorReady(page);
    await page.getByLabel("Note (optional)").fill("watch this");
    await output(page).getByRole("button", { name: "Copy" }).click();
    await expect(recentClips(page)).toBeVisible();
    await check(page);
  });

  test("create page with a video that can't play outside YouTube", async ({ page }) => {
    await openCreate(page, `?v=${ID}&t=90`, { errorCode: 150 });
    await expect(page.getByTestId("player-warning")).toBeVisible();
    await check(page);
  });

  test("create page asking where the sender paused", async ({ page }) => {
    await openCreate(page, `?v=${ID}`);
    await expect(page.getByLabel("Where did you pause?")).toBeVisible();
    await check(page);
  });

  test("install page with every section open", async ({ page }) => {
    await page.goto("/install");
    for (const id of ["android", "iphone", "desktop"]) {
      await page.getByTestId(`install-${id}`).evaluate((el) => ((el as HTMLDetailsElement).open = true));
    }
    await page.getByText("Can't drag it?").click();
    await expect(page.getByLabel("Bookmarklet code")).toBeVisible();
    await check(page);
  });

  test("viewer with a note, and its end panel", async ({ page }) => {
    const mock = await openClip(page, `/c/${ID}/90-95?n=${encodeURIComponent("look at this")}`);
    await expect(viewer(page)).toHaveAttribute("data-player-status", "ready");
    await mock.viewerPlay();
    await page.clock.runFor(5400);
    await expect(endPanel(page)).toBeVisible();
    // axe needs timers, and openClip froze the page clock.
    await page.clock.resume();
    await check(page);
  });

  test("viewer fallback card", async ({ page }) => {
    await openClip(page, `/c/${ID}/90-132`, { errorCode: 150 });
    await expect(fallbackCard(page)).toBeVisible();
    await page.clock.resume();
    await check(page);
  });

  test("broken clip link and unknown page", async ({ page }) => {
    await page.goto(`/c/${ID}/132-90`);
    await expect(page.getByTestId("broken-clip")).toBeVisible();
    await check(page);

    await page.goto("/no-such-page");
    await expect(page.getByTestId("not-found")).toBeVisible();
    await check(page);
  });

  test("error page", async ({ page }) => {
    await page.addInitScript(() => {
      const realSetAttribute = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function (name: string, value: string) {
        if (String(value).startsWith("javascript:")) throw new Error("e2e: forced error");
        return realSetAttribute.call(this, name, value);
      };
    });
    await page.goto("/install");
    await expect(page.getByTestId("error-view")).toBeVisible();
    await check(page);
  });

  test("every action on the create page is reachable with the keyboard", async ({ page }) => {
    await allowClipboard(page);
    await openCreate(page, `?v=${ID}&t=90`);
    await waitForEditorReady(page);

    const reached = new Set<string>();
    for (let i = 0; i < 60; i++) {
      await page.keyboard.press("Tab");
      const name = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return "";
        // Focus inside the YouTube player is drawn by YouTube.
        if (el.tagName === "IFRAME") return "player";
        // A visible focus ring on every stop.
        const style = getComputedStyle(el);
        const ring = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2;
        return `${ring ? "" : "NO RING: "}${el.getAttribute("aria-label") ?? el.id ?? ""}|${el.textContent?.trim() ?? ""}`;
      });
      reached.add(name);
    }
    const all = [...reached].join("\n");
    expect(all).not.toContain("NO RING");
    for (const label of ["paste-input", "clip-start", "clip-end", "clip-note", "|Preview", "|+30s", "|Copy", "|WhatsApp", "|Open"]) {
      expect(all, label).toContain(label);
    }
    expect(all).toContain("Start forward 5 seconds");
    expect(all).toContain("|Set start to now");
    expect(all).toContain("player");
  });
});
