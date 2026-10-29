import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    // Unit tests only. Playwright specs live in e2e/ and run with `npm run test:e2e`.
    include: ["lib/**/*.test.ts", "extension/src/**/*.test.ts"],
    environment: "node",
  },
});
