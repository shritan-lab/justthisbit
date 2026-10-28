import { describe, expect, it } from "vitest";
import { DRAFT_MESSAGES, checkClipDraft, problemPlace } from "./clip-draft";

const ID = "dQw4w9WgXcQ";
const draft = (startText: string, endText: string, note = "") => checkClipDraft({ videoId: ID, startText, endText, note });

describe("checkClipDraft", () => {
  it("returns the clip and its length for a valid draft", () => {
    expect(draft("1:30", "2:00")).toEqual({ ok: true, clip: { videoId: ID, start: 90, end: 120 }, length: 30 });
  });

  it("accepts every time format", () => {
    expect(draft("90", "2m")).toMatchObject({ ok: true, clip: { start: 90, end: 120 } });
    expect(draft("1m30s", "0:02:00")).toMatchObject({ ok: true, clip: { start: 90, end: 120 } });
  });

  it("trims the note and drops an empty one", () => {
    expect(draft("0", "1", "  hi  ")).toMatchObject({ ok: true, clip: { note: "hi" } });
    expect(draft("0", "1", "   ")).toEqual({ ok: true, clip: { videoId: ID, start: 0, end: 1 }, length: 1 });
  });

  it("allows 1 second and exactly 60 minutes", () => {
    expect(draft("0", "1")).toMatchObject({ ok: true, length: 1 });
    expect(draft("0", "1:00:00")).toMatchObject({ ok: true, length: 3600 });
  });

  it("flags bad times", () => {
    expect(draft("abc", "2:00")).toMatchObject({ ok: false, problem: "bad_start", start: null, end: 120 });
    expect(draft("", "2:00")).toMatchObject({ ok: false, problem: "bad_start" });
    expect(draft("1:30", "1:75")).toMatchObject({ ok: false, problem: "bad_end", start: 90, end: null });
  });

  it("flags an end at or before the start", () => {
    expect(draft("2:00", "1:30")).toMatchObject({ ok: false, problem: "end_before_start" });
    expect(draft("2:00", "2:00")).toMatchObject({ ok: false, problem: "end_before_start" });
  });

  it("flags clips over 60 minutes", () => {
    expect(draft("0", "1:00:01")).toMatchObject({ ok: false, problem: "too_long" });
  });

  it("flags a note over 140 characters, counting an emoji as one", () => {
    expect(draft("0", "1", "👀".repeat(140))).toMatchObject({ ok: true });
    expect(draft("0", "1", "a".repeat(141))).toMatchObject({ ok: false, problem: "note_too_long" });
  });

  it("flags a bad video id", () => {
    expect(checkClipDraft({ videoId: "nope", startText: "0", endText: "1", note: "" })).toMatchObject({
      ok: false,
      problem: "bad_video",
    });
  });

  it("flags absurd times instead of throwing", () => {
    expect(draft("99999999999", "99999999999999")).toMatchObject({ ok: false });
  });
});

describe("problemPlace and messages", () => {
  it("places each problem next to the field it is about", () => {
    expect(problemPlace("bad_start")).toBe("start");
    expect(problemPlace("bad_end")).toBe("end");
    expect(problemPlace("note_too_long")).toBe("note");
    expect(problemPlace("end_before_start")).toBe("range");
    expect(problemPlace("too_long")).toBe("range");
  });

  it("has plain copy with no em dashes", () => {
    for (const message of Object.values(DRAFT_MESSAGES)) expect(message).not.toMatch(/—/);
  });
});
