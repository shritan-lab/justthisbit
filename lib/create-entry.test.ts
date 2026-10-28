import { describe, expect, it } from "vitest";
import { MAX_ENTRY_INPUT_LENGTH, hasEntryInput, initialPasteInput } from "./create-entry";
import { parseYouTubeInput } from "./youtube";

const ID = "UF8uR6Z6KLc";

describe("initialPasteInput", () => {
  it("is empty with no params", () => {
    expect(initialPasteInput({})).toBe("");
    expect(initialPasteInput({ url: null, v: null, t: null })).toBe("");
    expect(initialPasteInput({ url: "   " })).toBe("");
  });

  it("uses ?url= as is", () => {
    const share = "Check this out https://youtu.be/UF8uR6Z6KLc?si=abc&t=840";
    expect(initialPasteInput({ url: share })).toBe(share);
    expect(parseYouTubeInput(initialPasteInput({ url: share }))).toEqual({ videoId: ID, startSeconds: 840 });
  });

  it("keeps an invalid ?url= so the page can show the error", () => {
    expect(initialPasteInput({ url: "https://example.com/nope" })).toBe("https://example.com/nope");
  });

  it("turns ?v=&t= into a youtu.be link with the start", () => {
    expect(initialPasteInput({ v: ID, t: "840" })).toBe(`https://youtu.be/${ID}?t=840`);
    expect(parseYouTubeInput(initialPasteInput({ v: ID, t: "840" }))).toEqual({ videoId: ID, startSeconds: 840 });
  });

  it("accepts any time format in t", () => {
    expect(initialPasteInput({ v: ID, t: "1m30s" })).toBe(`https://youtu.be/${ID}?t=90`);
    expect(initialPasteInput({ v: ID, t: "1:30" })).toBe(`https://youtu.be/${ID}?t=90`);
  });

  it("drops a missing, zero or junk t", () => {
    expect(initialPasteInput({ v: ID })).toBe(`https://youtu.be/${ID}`);
    expect(initialPasteInput({ v: ID, t: "0" })).toBe(`https://youtu.be/${ID}`);
    expect(initialPasteInput({ v: ID, t: "-5" })).toBe(`https://youtu.be/${ID}`);
    expect(initialPasteInput({ v: ID, t: "<script>" })).toBe(`https://youtu.be/${ID}`);
  });

  it("prefers a valid v over url", () => {
    expect(initialPasteInput({ v: ID, t: "10", url: "https://youtu.be/dQw4w9WgXcQ" })).toBe(`https://youtu.be/${ID}?t=10`);
  });

  it("falls back to url, then to the raw v, when v is invalid", () => {
    expect(initialPasteInput({ v: "short", url: "https://youtu.be/dQw4w9WgXcQ" })).toBe("https://youtu.be/dQw4w9WgXcQ");
    expect(initialPasteInput({ v: "short" })).toBe("short");
  });

  it("caps very long input", () => {
    expect(initialPasteInput({ url: "a".repeat(10_000) })).toHaveLength(MAX_ENTRY_INPUT_LENGTH);
  });

  it("never throws on odd values", () => {
    expect(initialPasteInput({ url: 42 as unknown as string })).toBe("");
  });
});

describe("hasEntryInput", () => {
  it("is true only when something will be pre-filled", () => {
    expect(hasEntryInput({})).toBe(false);
    expect(hasEntryInput({ url: " " })).toBe(false);
    expect(hasEntryInput({ v: ID })).toBe(true);
    expect(hasEntryInput({ url: "anything" })).toBe(true);
  });
});
