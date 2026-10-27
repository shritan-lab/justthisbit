import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const OEMBED_STUB_PORT = 3101;
const baseURL = `http://localhost:${PORT}`;

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
  // Chromium only. "mobile" uses a Chromium-based phone profile.
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
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
      env: { OEMBED_ENDPOINT: `http://localhost:${OEMBED_STUB_PORT}/oembed` },
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
    },
  ],
});
