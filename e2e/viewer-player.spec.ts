import { expect, test } from "@playwright/test";
import { endPanel, fallbackCard, openClip, playerFrame, viewer } from "./support/clip-page";
import { KNOWN_VIDEO } from "./support/fixtures";
import { IFRAME_API_URL, PlayerState } from "./support/youtube-mock";

const ID = KNOWN_VIDEO.id;

test.describe("player setup", () => {
  test("creates the iframe with the SPEC 5.1 playerVars and referrer policy", async ({ page }) => {
    const mock = await openClip(page, `/c/${ID}/90-132`);
    await expect(viewer(page)).toHaveAttribute("data-player-status", "ready");

    const iframe = playerFrame(page).locator("iframe");
    await expect(iframe).toHaveCount(1);
    await expect(iframe).toHaveAttribute("referrerpolicy", "strict-origin-when-cross-origin");

    const src = new URL((await iframe.getAttribute("src"))!);
    expect(src.origin + src.pathname).toBe(`https://www.youtube.com/embed/${ID}`);
    const origin = new URL(page.url()).origin;
    expect(Object.fromEntries(src.searchParams)).toEqual({
      start: "90",
      playsinline: "1",
      rel: "0",
      enablejsapi: "1",
      origin,
    });

    // The fake player saw the same vars, and nothing autoplayed.
    const snap = await mock.snapshot();
    expect(snap?.playerVars).not.toHaveProperty("end");
    expect(snap?.playerVars).not.toHaveProperty("autoplay");
    expect(snap?.state).toBe(PlayerState.UNSTARTED);
    expect(await mock.calls()).toEqual([]);
  });

  test("loads iframe_api exactly once and creates one player", async ({ page }) => {
    const mock = await openClip(page, `/c/${ID}/90-132`);
    await expect(viewer(page)).toHaveAttribute("data-player-status", "ready");
    expect(mock.apiRequests).toBe(1);
    expect(await mock.scriptRuns()).toBe(1);
    expect(await mock.playerCount()).toBe(1);
    expect(await page.locator(`script[src="${IFRAME_API_URL}"]`).count()).toBe(1);
  });
});

test.describe("end enforcement", () => {
  test("pauses when playback crosses end, shows the end panel, and Replay seeks to start", async ({ page }) => {
    const mock = await openClip(page, `/c/${ID}/90-95`);
    await expect(viewer(page)).toHaveAttribute("data-player-status", "ready");

    await mock.viewerPlay();
    await page.clock.runFor(4000);
    expect(await mock.state()).toBe(PlayerState.PLAYING);
    await expect(endPanel(page)).toHaveCount(0);

    await page.clock.runFor(1200);
    expect(await mock.state()).toBe(PlayerState.PAUSED);
    const stoppedAt = await mock.time();
    expect(stoppedAt).toBeGreaterThanOrEqual(95);
    expect(stoppedAt).toBeLessThanOrEqual(95.25); // one 200ms poll at most
    expect((await mock.calls()).map((c) => c.method)).toEqual(["pauseVideo"]);
    await expect(endPanel(page)).toBeVisible();

    await page.getByRole("button", { name: "Replay" }).click();
    expect(await mock.calls()).toEqual([
      { method: "pauseVideo", args: [] },
      { method: "seekTo", args: [90, true] },
      { method: "playVideo", args: [] },
    ]);
    expect(await mock.state()).toBe(PlayerState.PLAYING);
    expect(await mock.time()).toBe(90);
    await expect(endPanel(page)).toHaveCount(0);

    // The replay is enforced too.
    await page.clock.runFor(5200);
    expect(await mock.state()).toBe(PlayerState.PAUSED);
    await expect(endPanel(page)).toBeVisible();
  });

  test("pauses after the viewer scrubs inside the clip and plays on through end", async ({ page }) => {
    const mock = await openClip(page, `/c/${ID}/90-132`);
    await expect(viewer(page)).toHaveAttribute("data-player-status", "ready");
    await mock.viewerPlay();
    await page.clock.runFor(1000);
    await mock.viewerSeek(131);
    await page.clock.runFor(600);
    expect(await mock.state()).toBe(PlayerState.PLAYING);
    await page.clock.runFor(800);
    expect(await mock.state()).toBe(PlayerState.PAUSED);
    expect(await mock.time()).toBeGreaterThanOrEqual(132);
    await expect(endPanel(page)).toBeVisible();
  });

  test("shows the end panel below the player, never on top of it", async ({ page }) => {
    const mock = await openClip(page, `/c/${ID}/90-92`);
    await expect(viewer(page)).toHaveAttribute("data-player-status", "ready");
    await mock.viewerPlay();
    await page.clock.runFor(2400);
    await expect(endPanel(page)).toBeVisible();

    const player = (await playerFrame(page).boundingBox())!;
    const panel = (await endPanel(page).boundingBox())!;
    expect(panel.y).toBeGreaterThanOrEqual(player.y + player.height);
    // The player itself is still there and visible.
    await expect(playerFrame(page).locator("iframe")).toBeVisible();
  });

  test("treats ENDED as the clip end when end is past the end of the video", async ({ page }) => {
    const mock = await openClip(page, `/c/${ID}/90-200`, { duration: 100 });
    await expect(viewer(page)).toHaveAttribute("data-player-status", "ready");
    await mock.viewerPlay();
    await page.clock.runFor(10_500);
    expect(await mock.state()).toBe(PlayerState.ENDED);
    expect(await mock.calls()).toEqual([]);
    await expect(endPanel(page)).toBeVisible();
  });
});

test.describe("seeking outside the clip is never fought", () => {
  test("seeking past end while playing does not pause", async ({ page }) => {
    const mock = await openClip(page, `/c/${ID}/90-132`);
    await expect(viewer(page)).toHaveAttribute("data-player-status", "ready");
    await mock.viewerPlay();
    await page.clock.runFor(1000);
    await mock.viewerSeek(200);
    await page.clock.runFor(3000);
    expect(await mock.state()).toBe(PlayerState.PLAYING);
    expect(await mock.time()).toBeGreaterThan(202);
    expect(await mock.calls()).toEqual([]);
    await expect(endPanel(page)).toHaveCount(0);
  });

  test("a short seek across end does not pause", async ({ page }) => {
    const mock = await openClip(page, `/c/${ID}/90-132`);
    await expect(viewer(page)).toHaveAttribute("data-player-status", "ready");
    await mock.viewerPlay();
    await mock.viewerSeek(130);
    await page.clock.runFor(400);
    await mock.viewerSeek(137);
    await page.clock.runFor(2000);
    expect(await mock.state()).toBe(PlayerState.PLAYING);
    expect(await mock.calls()).toEqual([]);
  });

  test("seeking before start and playing does not pause", async ({ page }) => {
    const mock = await openClip(page, `/c/${ID}/90-132`);
    await expect(viewer(page)).toHaveAttribute("data-player-status", "ready");
    await mock.viewerSeek(10);
    await mock.viewerPlay();
    await page.clock.runFor(5000);
    expect(await mock.state()).toBe(PlayerState.PLAYING);
    expect(await mock.calls()).toEqual([]);
  });

  test("pausing, waiting, scrubbing past end and playing does not pause", async ({ page }) => {
    const mock = await openClip(page, `/c/${ID}/90-132`);
    await expect(viewer(page)).toHaveAttribute("data-player-status", "ready");
    await mock.viewerPlay();
    await page.clock.runFor(500);
    await mock.viewerPause();
    await page.clock.runFor(60_000);
    await mock.viewerSeek(140);
    await mock.viewerPlay();
    await page.clock.runFor(2000);
    expect(await mock.state()).toBe(PlayerState.PLAYING);
    expect(await mock.calls()).toEqual([]);
  });

  test("after the clip ends, playing on from YouTube's controls is not paused again", async ({ page }) => {
    const mock = await openClip(page, `/c/${ID}/90-92`);
    await expect(viewer(page)).toHaveAttribute("data-player-status", "ready");
    await mock.viewerPlay();
    await page.clock.runFor(2400);
    expect(await mock.state()).toBe(PlayerState.PAUSED);

    await mock.viewerPlay();
    await page.clock.runFor(3000);
    expect(await mock.state()).toBe(PlayerState.PLAYING);
    expect((await mock.calls()).map((c) => c.method)).toEqual(["pauseVideo"]);
  });
});

test.describe("errors show the fallback card", () => {
  for (const code of [2, 5, 100, 101, 150, 153, 999]) {
    test(`onError ${code}`, async ({ page }) => {
      await openClip(page, `/c/${ID}/90-132`, { errorCode: code });
      const card = fallbackCard(page);
      await expect(card).toBeVisible();
      await expect(viewer(page)).toHaveAttribute("data-player-status", "error");
      await expect(card.getByRole("heading")).toHaveText("This video can't play here");
      const link = card.getByRole("link", { name: "Open on YouTube at 1:30" });
      await expect(link).toHaveAttribute("href", `https://www.youtube.com/watch?v=${ID}&t=90s`);
      await expect(card).toContainText("Stop at 2:12");
      await expect(card.locator("img")).toHaveAttribute("src", `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
      // No black box: the iframe is gone and the player area is hidden.
      await expect(page.locator("iframe")).toHaveCount(0);
      await expect(playerFrame(page)).toBeHidden();
    });
  }

  test("an error during playback also shows the fallback", async ({ page }) => {
    const mock = await openClip(page, `/c/${ID}/90-132`);
    await expect(viewer(page)).toHaveAttribute("data-player-status", "ready");
    await mock.viewerPlay();
    await page.clock.runFor(1000);
    await mock.fireError(5);
    await expect(fallbackCard(page)).toBeVisible();
    await expect(page.locator("iframe")).toHaveCount(0);
  });

  test("a blocked iframe_api script shows the fallback", async ({ page }) => {
    await page.route(IFRAME_API_URL, (route) => route.abort("blockedbyclient"));
    await page.goto(`/c/${ID}/90-132`);
    await expect(fallbackCard(page)).toBeVisible();
    await expect(fallbackCard(page).getByRole("link", { name: "Open on YouTube at 1:30" })).toBeVisible();
  });
});

test.describe("onReady timeout", () => {
  test("shows the fallback 10 seconds after load when onReady never fires", async ({ page }) => {
    const mock = await openClip(page, `/c/${ID}/90-132`, { ready: false });
    await expect(viewer(page)).toHaveAttribute("data-player-status", "loading");

    await page.clock.runFor(9_900);
    await expect(viewer(page)).toHaveAttribute("data-player-status", "loading");
    await expect(fallbackCard(page)).toHaveCount(0);

    await page.clock.runFor(200);
    await expect(fallbackCard(page)).toBeVisible();
    await expect(viewer(page)).toHaveAttribute("data-player-status", "error");
    expect((await mock.calls()).map((c) => c.method)).toEqual(["destroy"]);
    await expect(page.locator("iframe")).toHaveCount(0);
  });
});
