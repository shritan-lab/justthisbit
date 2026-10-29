import { describe, expect, it } from "vitest";
import {
  MAX_CLIP_SECONDS,
  MAX_NOTE_LENGTH,
  buildClipPath,
  buildClipUrl,
  isClipUrl,
  limitNote,
  matchClipPath,
  noteLength,
  parseClipParams,
  youtubeWatchUrl,
} from "./clip";

const ID = "dQw4w9WgXcQ";

/** Simulates a full round trip: build a path, then read it back the way the route will. */
function roundTrip(path: string) {
  const url = new URL(path, "https://example.test");
  const raw = matchClipPath(url.pathname);
  if (!raw) throw new Error(`not a clip path: ${path}`);
  const n = url.searchParams.get("n");
  return parseClipParams(n === null ? raw : { ...raw, n });
}

describe("buildClipPath", () => {
  it("builds a path without a note", () => {
    expect(buildClipPath({ videoId: ID, start: 90, end: 132 })).toBe(`/c/${ID}/90-132`);
  });

  it("matches the spec example", () => {
    expect(buildClipPath({ videoId: ID, start: 90, end: 132, note: "watch his face" })).toBe(
      `/c/${ID}/90-132?n=watch%20his%20face`,
    );
  });

  it("trims the note", () => {
    expect(buildClipPath({ videoId: ID, start: 0, end: 1, note: "  hi  " })).toBe(`/c/${ID}/0-1?n=hi`);
  });

  it.each([[""], ["   "], ["\n\t "]])("drops an empty note %j", (note) => {
    expect(buildClipPath({ videoId: ID, start: 0, end: 30, note })).toBe(`/c/${ID}/0-30`);
  });

  it.each([
    ["emoji", "lol 😂🔥"],
    ["newlines", "line one\nline two"],
    ["ampersand", "this & that"],
    ["hash", "#1 moment"],
    ["question mark", "wait for it?"],
    ["equals and plus", "a=b+c"],
    ["percent", "100% true"],
    ["slashes", "before/after"],
  ])("encodes a note with %s so it survives a round trip", (_label, note) => {
    const path = buildClipPath({ videoId: ID, start: 10, end: 20, note });
    expect(path).not.toContain(" ");
    expect(path.split("?")).toHaveLength(2);
    expect(path).not.toContain("#");
    expect(roundTrip(path)).toEqual({ ok: true, clip: { videoId: ID, start: 10, end: 20, note } });
  });
});

describe("parseClipParams: valid", () => {
  it("parses a clip without a note", () => {
    expect(parseClipParams({ videoId: ID, range: "90-132" })).toEqual({
      ok: true,
      clip: { videoId: ID, start: 90, end: 132 },
    });
  });

  it("parses a clip with a note", () => {
    expect(parseClipParams({ videoId: ID, range: "90-132", n: "watch his face" })).toEqual({
      ok: true,
      clip: { videoId: ID, start: 90, end: 132, note: "watch his face" },
    });
  });

  it.each([
    ["0-1", 0, 1],
    ["5-6", 5, 6],
    ["0-3600", 0, 3600],
    ["100-3700", 100, 3700],
    ["36000-36030", 36000, 36030],
  ])("accepts boundary range %s", (range, start, end) => {
    expect(parseClipParams({ videoId: ID, range })).toEqual({ ok: true, clip: { videoId: ID, start, end } });
  });

  it("trims the note and drops it when empty", () => {
    expect(parseClipParams({ videoId: ID, range: "0-10", n: "   " })).toEqual({
      ok: true,
      clip: { videoId: ID, start: 0, end: 10 },
    });
    expect(parseClipParams({ videoId: ID, range: "0-10", n: "  hey  " })).toEqual({
      ok: true,
      clip: { videoId: ID, start: 0, end: 10, note: "hey" },
    });
  });

  it("uses the first note when n is repeated", () => {
    expect(parseClipParams({ videoId: ID, range: "0-10", n: ["first", "second"] })).toEqual({
      ok: true,
      clip: { videoId: ID, start: 0, end: 10, note: "first" },
    });
  });

  it("ignores a note of the wrong type", () => {
    expect(parseClipParams({ videoId: ID, range: "0-10", n: 42 })).toEqual({
      ok: true,
      clip: { videoId: ID, start: 0, end: 10 },
    });
  });

  it(`accepts a note of exactly ${MAX_NOTE_LENGTH} characters`, () => {
    const note = "a".repeat(MAX_NOTE_LENGTH);
    expect(parseClipParams({ videoId: ID, range: "0-10", n: note })).toEqual({
      ok: true,
      clip: { videoId: ID, start: 0, end: 10, note },
    });
  });

  it(`counts each emoji as one character (${MAX_NOTE_LENGTH} emoji is fine)`, () => {
    const note = "😂".repeat(MAX_NOTE_LENGTH);
    expect(parseClipParams({ videoId: ID, range: "0-10", n: note }).ok).toBe(true);
  });
});

describe("parseClipParams: errors", () => {
  it.each([
    ["too short", "dQw4w9WgXc"],
    ["too long", "dQw4w9WgXcQQ"],
    ["bad character", "dQw4w9WgX!Q"],
    ["space", "dQw4w9 gXcQ"],
    ["empty", ""],
    ["slash", "dQw4w9/gXcQ"],
  ])("bad_id: %s", (_label, videoId) => {
    expect(parseClipParams({ videoId, range: "0-10" })).toEqual({ ok: false, reason: "bad_id" });
  });

  it("bad_id: missing or wrong type", () => {
    expect(parseClipParams({ range: "0-10" })).toEqual({ ok: false, reason: "bad_id" });
    expect(parseClipParams({ videoId: 123, range: "0-10" })).toEqual({ ok: false, reason: "bad_id" });
  });

  it("checks the id before the range", () => {
    expect(parseClipParams({ videoId: "bad", range: "junk" })).toEqual({ ok: false, reason: "bad_id" });
  });

  it.each([
    ["end before start", "132-90"],
    ["no dash", "90"],
    ["empty", ""],
    ["letters", "a-b"],
    ["negative", "-5-10"],
    ["decimal", "1.5-10"],
    ["exponent", "1e2-300"],
    ["extra part", "1-2-3"],
    ["spaces", "1 - 2"],
    ["plus sign", "+1-2"],
    ["too many digits", "1234567890-1234567891"],
    ["clock format", "1:30-2:12"],
  ])("bad_range: %s", (_label, range) => {
    expect(parseClipParams({ videoId: ID, range })).toEqual({ ok: false, reason: "bad_range" });
  });

  it("bad_range: missing", () => {
    expect(parseClipParams({ videoId: ID })).toEqual({ ok: false, reason: "bad_range" });
  });

  it.each([["0-0"], ["90-90"]])("too_short: %s", (range) => {
    expect(parseClipParams({ videoId: ID, range })).toEqual({ ok: false, reason: "too_short" });
  });

  it.each([["0-3601"], ["100-3701"], ["0-99999"]])("too_long: %s", (range) => {
    expect(parseClipParams({ videoId: ID, range })).toEqual({ ok: false, reason: "too_long" });
  });

  it(`note_too_long: ${MAX_NOTE_LENGTH + 1} characters`, () => {
    expect(parseClipParams({ videoId: ID, range: "0-10", n: "a".repeat(MAX_NOTE_LENGTH + 1) })).toEqual({
      ok: false,
      reason: "note_too_long",
    });
  });

  it("note length is measured after trimming", () => {
    const note = `   ${"a".repeat(MAX_NOTE_LENGTH)}   `;
    expect(parseClipParams({ videoId: ID, range: "0-10", n: note }).ok).toBe(true);
  });
});

describe("noteLength", () => {
  it.each([
    ["", 0],
    ["abc", 3],
    ["😂", 1],
    ["a😂b", 3],
    ["line\nbreak", 10],
  ])("%j -> %i", (note, length) => {
    expect(noteLength(note)).toBe(length);
  });
});

describe("matchClipPath", () => {
  it("splits a clip path", () => {
    expect(matchClipPath(`/c/${ID}/90-132`)).toEqual({ videoId: ID, range: "90-132" });
    expect(matchClipPath(`/c/${ID}/90-132/`)).toEqual({ videoId: ID, range: "90-132" });
  });

  it.each([["/"], ["/c"], [`/c/${ID}`], [`/c/${ID}/90-132/extra`], [`/x/${ID}/90-132`], ["/c/%E0%A4%A/1-2"]])(
    "returns null for %s",
    (path) => {
      expect(matchClipPath(path)).toBeNull();
    },
  );
});

describe("youtubeWatchUrl", () => {
  it.each([
    [90, `https://www.youtube.com/watch?v=${ID}&t=90s`],
    [0, `https://www.youtube.com/watch?v=${ID}&t=0s`],
    [90.7, `https://www.youtube.com/watch?v=${ID}&t=90s`],
    [-3, `https://www.youtube.com/watch?v=${ID}&t=0s`],
    [Number.NaN, `https://www.youtube.com/watch?v=${ID}&t=0s`],
  ])("start %d", (start, url) => {
    expect(youtubeWatchUrl(ID, start)).toBe(url);
  });
});

describe("limits", () => {
  it("match the spec", () => {
    expect(MAX_CLIP_SECONDS).toBe(3600);
    expect(MAX_NOTE_LENGTH).toBe(140);
  });
});

describe("buildClipUrl", () => {
  const SITE = "https://justthisbit.vercel.app";

  it("puts the clip path on the site origin", () => {
    expect(buildClipUrl({ videoId: ID, start: 90, end: 120 }, SITE)).toBe(`${SITE}/c/${ID}/90-120`);
  });

  it("keeps the encoded note", () => {
    expect(buildClipUrl({ videoId: ID, start: 720, end: 750, note: "the dots connect 👀" }, SITE)).toBe(
      `${SITE}/c/${ID}/720-750?n=the%20dots%20connect%20%F0%9F%91%80`,
    );
  });

  it("does not double the slash when the origin has a trailing slash", () => {
    expect(buildClipUrl({ videoId: ID, start: 0, end: 1 }, `${SITE}/`)).toBe(`${SITE}/c/${ID}/0-1`);
  });

  it("round-trips a note with &, #, ? and a newline", () => {
    const note = "a & b #1?\nnext line";
    const url = new URL(buildClipUrl({ videoId: ID, start: 1, end: 2, note }, SITE));
    expect(url.origin).toBe(SITE);
    expect(url.searchParams.get("n")).toBe(note);
  });
});

describe("isClipUrl", () => {
  it("accepts clip links on http and https", () => {
    expect(isClipUrl(`https://justthisbit.vercel.app/c/${ID}/90-120`)).toBe(true);
    expect(isClipUrl(`http://localhost:3000/c/${ID}/90-120?n=hi`)).toBe(true);
  });

  it("rejects other schemes, other paths and broken clips", () => {
    expect(isClipUrl(`javascript:alert(1)//c/${ID}/90-120`)).toBe(false);
    expect(isClipUrl(`data:text/html,/c/${ID}/90-120`)).toBe(false);
    expect(isClipUrl("https://justthisbit.vercel.app/")).toBe(false);
    expect(isClipUrl(`https://justthisbit.vercel.app/c/${ID}/120-90`)).toBe(false);
    expect(isClipUrl(`https://justthisbit.vercel.app/c/short/1-2`)).toBe(false);
    expect(isClipUrl("not a url")).toBe(false);
    expect(isClipUrl(42)).toBe(false);
    expect(isClipUrl(`https://x.test/c/${ID}/1-2?n=${"a".repeat(141)}`)).toBe(false);
  });
});

describe("limitNote", () => {
  it("keeps notes at or under the limit as they are", () => {
    expect(limitNote("")).toBe("");
    expect(limitNote("watch his face")).toBe("watch his face");
    expect(limitNote("a".repeat(MAX_NOTE_LENGTH))).toBe("a".repeat(MAX_NOTE_LENGTH));
  });

  it("cuts longer notes to the limit", () => {
    expect(limitNote("a".repeat(MAX_NOTE_LENGTH + 5))).toBe("a".repeat(MAX_NOTE_LENGTH));
  });

  it("counts an emoji as one character and never splits it", () => {
    const note = "😀".repeat(MAX_NOTE_LENGTH + 1);
    const cut = limitNote(note);
    expect(noteLength(cut)).toBe(MAX_NOTE_LENGTH);
    expect(cut).toBe("😀".repeat(MAX_NOTE_LENGTH));
  });

  it("keeps newlines and leaves trimming to buildClipPath", () => {
    expect(limitNote(" a\nb ")).toBe(" a\nb ");
  });
});
