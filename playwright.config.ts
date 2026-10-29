import { defineConfig, devices } from "@playwright/test";
import { E2E_PRODUCTION_HOST } from "./e2e/support/fixtures";

const PORT = 3100;
const OEMBED_STUB_PORT = 3101;
const baseURL = `http://localhost:${PORT}`;
const EXTENSION_SPEC = /extension\.spec\.ts$/;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  // Chromium only. "mobile" uses a Chromium-based phone profile. "extension" loads the built
  // Chrome extension (extension/dist) into its own Chromium, so it runs once, not per device.
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: EXTENSION_SPEC },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: EXTENSION_SPEC },
    // Each test starts a full Chromium with the extension, so two at a time keeps them fast.
    { name: "extension", testMatch: EXTENSION_SPEC, workers: 2 },
  ],
  webServer: [
    {
      // Stand-in for YouTube oEmbed, so server-rendered titles are deterministic and offline.
      command: `node e2e/support/oembed-stub.mjs`,
      url: `http://localhost:${OEMBED_STUB_PORT}/health`,
      env: { OEMBED_STUB_PORT: String(OEMBED_STUB_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run build && npx next start --port ${PORT}`,
      url: baseURL,
      env: {
        OEMBED_ENDPOINT: `http://localhost:${OEMBED_STUB_PORT}/oembed`,
        // Built like production, so generated links must use this origin, not localhost.
        VERCEL_PROJECT_PRODUCTION_URL: E2E_PRODUCTION_HOST,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
  ],
});
