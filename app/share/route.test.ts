import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as shareTarget from "@/lib/share-target";
import { GET } from "./route";

const ORIGIN = "https://justthisbit.vercel.app";

function get(query: string) {
  return GET(new NextRequest(`${ORIGIN}/share${query}`));
}

describe("GET /share", () => {
  afterEach(() => vi.restoreAllMocks());

  it("redirects a shared YouTube link to the create page", () => {
    const res = get(`?text=${encodeURIComponent("Check this out https://youtu.be/dQw4w9WgXcQ?t=90")}`);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/?v=dQw4w9WgXcQ&t=90`);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("falls back to the create page instead of an error when something throws", () => {
    vi.spyOn(shareTarget, "shareTargetRedirect").mockImplementation(() => {
      throw new Error("boom");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = get("?url=https://youtu.be/dQw4w9WgXcQ");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/`);
  });
});
