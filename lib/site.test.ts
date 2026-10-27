import { describe, expect, it } from "vitest";
import { SITE_NAME, getSiteUrl } from "./site";

describe("getSiteUrl", () => {
  it("falls back to localhost", () => {
    expect(getSiteUrl({})).toBe("http://localhost:3000");
    expect(getSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "  " })).toBe("http://localhost:3000");
  });

  it("prefixes the Vercel host with https://", () => {
    expect(getSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "justthisbit.vercel.app" })).toBe(
      "https://justthisbit.vercel.app",
    );
  });

  it("does not double the scheme and drops a trailing slash", () => {
    expect(getSiteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "https://justthisbit.vercel.app/" })).toBe(
      "https://justthisbit.vercel.app",
    );
  });
});

describe("SITE_NAME", () => {
  it("is the working name", () => {
    expect(SITE_NAME).toBe("Just This Bit");
  });
});
