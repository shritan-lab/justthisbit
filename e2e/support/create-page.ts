import { expect, type Page } from "@playwright/test";
import { YouTubeMock, type YouTubeMockConfig } from "./youtube-mock";

/** Opens the create page with the fake YouTube API. `query` is everything after "/", e.g. "?v=...". */
export async function openCreate(page: Page, query = "", config: YouTubeMockConfig = {}): Promise<YouTubeMock> {
  const mock = await YouTubeMock.install(page, config);
  await page.goto(`/${query}`);
  return mock;
}

export const pasteField = (page: Page) => page.getByLabel("YouTube link");
export const startField = (page: Page) => page.getByLabel("Start", { exact: true });
export const endField = (page: Page) => page.getByLabel("End", { exact: true });
export const noteField = (page: Page) => page.getByLabel("Note (optional)");
export const editor = (page: Page) => page.getByTestId("clip-editor");
export const clipUrl = (page: Page) => page.getByTestId("clip-url");
export const clipLength = (page: Page) => page.getByTestId("clip-length");
export const output = (page: Page) => page.getByTestId("clip-output");
export const recentClips = (page: Page) => page.getByTestId("recent-clips");

export async function waitForEditorReady(page: Page) {
  await expect(editor(page)).toHaveAttribute("data-player-status", "ready");
}

/** Lets the page read and write the clipboard (Chromium needs both permissions). */
export async function allowClipboard(page: Page) {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
}

export function readClipboard(page: Page): Promise<string> {
  return page.evaluate(() => navigator.clipboard.readText());
}

export function writeClipboard(page: Page, text: string): Promise<void> {
  return page.evaluate((t) => navigator.clipboard.writeText(t), text);
}
