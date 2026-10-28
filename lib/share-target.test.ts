import { describe, expect, it } from "vitest";
import { MAX_ENTRY_INPUT_LENGTH } from "./create-entry";
import { shareTargetRedirect } from "./share-target";

const ID = "UF8uR6Z6KLc";

describe("shareTargetRedirect", () => {
  it("finds an Android-style link with words around it in text", () => {
    expect(shareTargetRedirect({ text: `Check this out https://youtu.be/${ID}?si=abc&t=840` })).toBe(`/?v=${ID}&t=840`);
  });

  it("finds a link in url", () => {
    expect(shareTargetRedirect({ url: `https://www.youtube.com/watch?v=${ID}&t=1m30s` })).toBe(`/?v=${ID}&t=90`);
  });

  it("finds a link in title", () => {
    expect(shareTargetRedirect({ title: `Funny bit https://youtu.be/${ID}` })).toBe(`/?v=${ID}`);
  });

  it("drops t when the link has no time or t=0", () => {
    expect(shareTargetRedirect({ text: `https://youtu.be/${ID}?si=abc` })).toBe(`/?v=${ID}`);
    expect(shareTargetRedirect({ text: `https://youtu.be/${ID}?t=0` })).toBe(`/?v=${ID}`);
  });

  it("uses text when url is junk", () => {
    expect(shareTargetRedirect({ url: "nope", text: `https://youtu.be/${ID}?t=5` })).toBe(`/?v=${ID}&t=5`);
  });

  it("prefers url over text and title", () => {
    const other = "dQw4w9WgXcQ";
    expect(
      shareTargetRedirect({ url: `https://youtu.be/${ID}`, text: `https://youtu.be/${other}`, title: "x" }),
    ).toBe(`/?v=${ID}`);
  });

  it("uses text when title is just the video title", () => {
    expect(shareTargetRedirect({ title: "My video", text: `https://youtu.be/${ID}?t=12` })).toBe(`/?v=${ID}&t=12`);
  });

  it("handles Shorts and live links", () => {
    expect(shareTargetRedirect({ text: `https://youtube.com/shorts/${ID}?si=x` })).toBe(`/?v=${ID}`);
    expect(shareTargetRedirect({ text: `https://www.youtube.com/live/${ID}?t=60` })).toBe(`/?v=${ID}&t=60`);
  });

  it("sends junk to the create page with the raw text", () => {
    expect(shareTargetRedirect({ text: "hello there & welcome" })).toBe("/?url=hello+there+%26+welcome");
  });

  it("keeps the first non-empty field as the raw text, in url, text, title order", () => {
    expect(shareTargetRedirect({ title: "a title", text: "some text" })).toBe("/?url=some+text");
    expect(shareTargetRedirect({ title: "a title", url: "  " })).toBe("/?url=a+title");
  });

  it("sends an empty share to the plain create page", () => {
    expect(shareTargetRedirect({})).toBe("/");
    expect(shareTargetRedirect({ title: "", text: "   ", url: null })).toBe("/");
  });

  it("ignores values that are not strings", () => {
    expect(shareTargetRedirect({ text: 42 as unknown as string })).toBe("/");
  });

  it("caps very long raw text", () => {
    const long = "x".repeat(MAX_ENTRY_INPUT_LENGTH + 500);
    const target = shareTargetRedirect({ text: long });
    expect(new URLSearchParams(target.slice(2)).get("url")).toHaveLength(MAX_ENTRY_INPUT_LENGTH);
  });

  it("does not let a share redirect off-site", () => {
    expect(shareTargetRedirect({ text: "//evil.example.com" })).toBe("/?url=%2F%2Fevil.example.com");
  });
});
