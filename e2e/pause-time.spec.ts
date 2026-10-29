import { expect, test, type Page } from "@playwright/test";
import { clipUrl, endField, openCreate, pasteField, startField, waitForEditorReady } from "./support/create-page";
import { E2E_SITE_URL } from "./support/fixtures";
import { PlayerState } from "./support/youtube-mock";

// A share from the YouTube Android app with the "Start at" switch off has no time in it.
// The create page then asks where the sender paused.
const ID = "UF8uR6Z6KLc";
const TIP = "Next time, turn on Start at in YouTube's Share menu and this fills in by itself.";
const ERROR = "Time not understood. Try 5:02 or 302.";

const share = (text: string) => `share?${new URLSearchParams({ text }).toString()}`;
const pauseField = (page: Page) => page.getByLabel("Where did you pause?");
const tip = (page: Page) => page.getByText(TIP, { exact: true });
const alerts = (page: Page) => page.getByRole("main").getByRole("alert");

test.describe("Where did you pause?", () => {
  test("a share without a time shows the field, focused and with a number pad, and the tip", async ({ page }) => {
    await openCreate(page, share(`https://youtu.be/${ID}`));
    await expect(page).toHaveURL(new RegExp(`/\\?v=${ID}$`));

    await expect(pauseField(page)).toBeVisible();
    await expect(pauseField(page)).toBeFocused();
    await expect(pauseField(page)).toHaveAttribute("inputmode", "decimal");
    await expect(pauseField(page)).toHaveAttribute("pattern", /.+/);
    await expect(pauseField(page)).toHaveValue("");
    await expect(tip(page)).toBeVisible();
    await expect(pauseField(page)).toHaveAttribute("aria-describedby", "pause-time-tip");

    // Nothing else changes: the editor starts at 0:00 like before.
    await expect(startField(page)).toHaveValue("0:00");
    await expect(endField(page)).toHaveValue("0:30");
    await expect(pasteField(page)).not.toBeFocused();
    await expect(alerts(page)).toHaveCount(0);
  });

  test("typing 5:02 sets start 5:02, end 5:32 and cues the player there without playing", async ({ page }) => {
    const mock = await openCreate(page, share(`Check this out https://youtu.be/${ID}?si=abc`));
    await waitForEditorReady(page);

    await pauseField(page).pressSequentially("5:02");
    await expect(startField(page)).toHaveValue("5:02");
    await expect(endField(page)).toHaveValue("5:32");
    await expect(clipUrl(page)).toHaveText(`${E2E_SITE_URL}/c/${ID}/302-332`);
    await expect(alerts(page)).toHaveCount(0);

    await expect.poll(async () => (await mock.snapshot())?.time).toBe(302);
    expect(await mock.state()).toBe(PlayerState.CUED);
    const calls = await mock.calls();
    expect(calls.filter((c) => c.method === "playVideo")).toHaveLength(0);
    expect(calls.filter((c) => c.method === "cueVideoById").at(-1)?.args[0]).toEqual({ videoId: ID, startSeconds: 302 });

    // The end follows the start like a shared time: a nudge moves both.
    await page.getByRole("button", { name: "Start forward 5 seconds" }).click();
    await expect(startField(page)).toHaveValue("5:07");
    await expect(endField(page)).toHaveValue("5:37");
  });

  test("takes 1:05:30, 302 and the number pad's 5.02", async ({ page }) => {
    await openCreate(page, `?url=${encodeURIComponent(`https://youtu.be/${ID}`)}`);
    await expect(pauseField(page)).toBeFocused();

    await pauseField(page).pressSequentially("1:05:30");
    await expect(startField(page)).toHaveValue("1:05:30");
    await expect(endField(page)).toHaveValue("1:06:00");

    await pauseField(page).fill("302");
    await expect(startField(page)).toHaveValue("5:02");
    await expect(endField(page)).toHaveValue("5:32");

    await pauseField(page).fill("");
    await pauseField(page).pressSequentially("5.02");
    await expect(startField(page)).toHaveValue("5:02");
    await expect(endField(page)).toHaveValue("5:32");
    await pauseField(page).press("Enter");
    await expect(alerts(page)).toHaveCount(0);
    await expect(pauseField(page)).not.toBeFocused();
  });

  test("a share with t=840 shows neither the field nor the tip", async ({ page }) => {
    await openCreate(page, share(`https://youtu.be/${ID}?t=840`));
    await expect(page).toHaveURL(new RegExp(`/\\?v=${ID}&t=840$`));
    await expect(startField(page)).toHaveValue("14:00");
    await expect(endField(page)).toHaveValue("14:30");
    await expect(pauseField(page)).toHaveCount(0);
    await expect(tip(page)).toHaveCount(0);
  });

  test("an invalid entry shows a clear error, and a good time clears it", async ({ page }) => {
    await openCreate(page, share(`https://youtu.be/${ID}`));
    await pauseField(page).fill("abc");
    // No error while typing.
    await expect(alerts(page)).toHaveCount(0);
    await pauseField(page).press("Enter");
    await expect(alerts(page)).toHaveText(ERROR);
    await expect(pauseField(page)).toHaveAttribute("aria-invalid", "true");
    await expect(pauseField(page)).toHaveAttribute("aria-describedby", "pause-time-error pause-time-tip");
    // The editor keeps its times.
    await expect(startField(page)).toHaveValue("0:00");

    // Out of range seconds are an error too, also when leaving the field.
    await pauseField(page).fill("5:75");
    await startField(page).focus();
    await expect(alerts(page)).toHaveText(ERROR);

    await pauseField(page).fill("5:02");
    await expect(alerts(page)).toHaveCount(0);
    await expect(pauseField(page)).not.toHaveAttribute("aria-invalid", "true");
    await expect(startField(page)).toHaveValue("5:02");
  });

  test("pasting a link by hand does not ask, even without a time", async ({ page }) => {
    await openCreate(page);
    await pasteField(page).fill(`https://youtu.be/${ID}`);
    await expect(startField(page)).toHaveValue("0:00");
    await expect(pauseField(page)).toHaveCount(0);
    await expect(tip(page)).toHaveCount(0);
  });
});
