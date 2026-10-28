import { describe, expect, it } from "vitest";
import { clipPlayerVars, isEmbedBlockedCode, youtubeEmbedUrl, youtubeThumbnailUrl } from "./youtube-embed";

const ID = "dQw4w9WgXcQ";
const ORIGIN = "https://justthisbit.vercel.app";

describe("clipPlayerVars", () => {
  it("returns the SPEC 5.1 playerVars", () => {
    expect(clipPlayerVars(90, ORIGIN)).toEqual({ start: 90, playsinline: 1, rel: 0, enablejsapi: 1, origin: ORIGIN });
  });

  it("never includes end or autoplay", () => {
    const vars = clipPlayerVars(90, ORIGIN);
    expect(vars).not.toHaveProperty("end");
    expect(vars).not.toHaveProperty("autoplay");
  });

  it.each([
    [0, 0],
    [1.9, 1],
    [-5, 0],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
  ])("start %s becomes %s", (input, expected) => {
    expect(clipPlayerVars(input, ORIGIN).start).toBe(expected);
  });
});

describe("youtubeEmbedUrl", () => {
  it("puts every playerVar in the query string", () => {
    const url = new URL(youtubeEmbedUrl(ID, clipPlayerVars(90, ORIGIN)));
    expect(url.origin + url.pathname).toBe(`https://www.youtube.com/embed/${ID}`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      start: "90",
      playsinline: "1",
      rel: "0",
      enablejsapi: "1",
      origin: ORIGIN,
    });
  });

  it("encodes the origin", () => {
    expect(youtubeEmbedUrl(ID, clipPlayerVars(0, "http://localhost:3000"))).toContain(
      "origin=http%3A%2F%2Flocalhost%3A3000",
    );
  });
});

describe("youtubeThumbnailUrl", () => {
  it("uses hqdefault on i.ytimg.com", () => {
    expect(youtubeThumbnailUrl(ID)).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
  });
});

describe("isEmbedBlockedCode", () => {
  it("is true for 101, 150 and 153", () => {
    for (const code of [101, 150, 153]) expect(isEmbedBlockedCode(code)).toBe(true);
  });

  it("is false for other errors", () => {
    for (const code of [2, 5, 100, 0, -1, 999, Number.NaN]) expect(isEmbedBlockedCode(code)).toBe(false);
  });
});
