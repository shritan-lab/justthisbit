import type { Page } from "@playwright/test";
import { YouTubeMock, type YouTubeMockConfig } from "./youtube-mock";

const T0 = new Date("2026-06-01T12:00:00Z");
const STEP_MS = 10;
const MAX_STEPS = 200;

/**
 * Opens a clip page with the fake YouTube API and a frozen page clock.
 *
 * Next.js waits on a short timer before hydrating, so the clock is stepped 10ms at a time
 * until the app has created its player. From then on nothing timer-based moves until the
 * test calls page.clock.runFor(). The player's 10 second ready timer starts at most a
 * couple of steps before this returns.
 */
export async function openClip(page: Page, path: string, config: YouTubeMockConfig = {}): Promise<YouTubeMock> {
  const mock = await YouTubeMock.install(page, config);
  await page.clock.install({ time: T0 });
  await page.clock.pauseAt(new Date(T0.getTime() + 1000));
  await page.goto(path);

  for (let step = 0; step < MAX_STEPS; step++) {
    if ((await mock.playerCount()) > 0) return mock;
    await page.clock.runFor(STEP_MS);
    // Real time for network work (loading iframe_api) between steps.
    await page.waitForTimeout(25);
  }
  throw new Error(`No player was created within ${MAX_STEPS * STEP_MS}ms of page time`);
}

export const viewer = (page: Page) => page.getByTestId("clip-viewer");
export const endPanel = (page: Page) => page.getByTestId("end-panel");
export const fallbackCard = (page: Page) => page.getByTestId("fallback-card");
export const playerFrame = (page: Page) => page.getByTestId("player-frame");
