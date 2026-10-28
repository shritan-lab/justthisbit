import { afterEach, describe, expect, it, vi } from "vitest";
import { SITE_NAME, getSiteUrl } from "./site";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

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

  it("uses the production domain on a preview build, never the preview URL", () => {
    expect(
      getSiteUrl({
        VERCEL_ENV: "preview",
        VERCEL_URL: "justthisbit-git-feature-shritan-lab.vercel.app",
        VERCEL_BRANCH_URL: "justthisbit-git-feature-shritan-lab.vercel.app",
        VERCEL_PROJECT_PRODUCTION_URL: "justthisbit.vercel.app",
      }),
    ).toBe("https://justthisbit.vercel.app");
  });
});

describe("site URL in the browser bundle", () => {
  it("next.config inlines the production site URL as NEXT_PUBLIC_SITE_URL", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "justthisbit-abc123-shritan-lab.vercel.app");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "justthisbit.vercel.app");
    const { default: nextConfig } = await import("../next.config");
    expect(nextConfig.env?.NEXT_PUBLIC_SITE_URL).toBe("https://justthisbit.vercel.app");
  });

  it("next.config inlines localhost when there is no Vercel host", async () => {
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    const { default: nextConfig } = await import("../next.config");
    expect(nextConfig.env?.NEXT_PUBLIC_SITE_URL).toBe("http://localhost:3000");
  });

  it("SITE_URL prefers the inlined NEXT_PUBLIC_SITE_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://justthisbit.vercel.app");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    const { SITE_URL } = await import("./site");
    expect(SITE_URL).toBe("https://justthisbit.vercel.app");
  });

  it("SITE_URL falls back to getSiteUrl() outside a Next build", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "justthisbit.vercel.app");
    const { SITE_URL } = await import("./site");
    expect(SITE_URL).toBe("https://justthisbit.vercel.app");
  });
});

describe("SITE_NAME", () => {
  it("is the working name", () => {
    expect(SITE_NAME).toBe("Just This Bit");
  });
});
