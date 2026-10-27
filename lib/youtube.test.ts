import { describe, expect, it } from "vitest";
import { parseYouTubeInput } from "./youtube";

const ID = "dQw4w9WgXcQ";
const ID2 = "a-b_c-d_e-f"; // uses every non-alphanumeric character allowed in an id

describe("parseYouTubeInput: watch URLs", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["https://youtube.com/watch?v=dQw4w9WgXcQ"],
    ["http://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["https://music.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["HTTPS://WWW.YOUTUBE.COM/watch?v=dQw4w9WgXcQ"],
    ["https://www.youtube.com/watch/?v=dQw4w9WgXcQ"],
  ])("%s", (input) => {
    expect(parseYouTubeInput(input)).toEqual({ videoId: ID });
  });

  it("accepts ids with - and _", () => {
    expect(parseYouTubeInput(`https://www.youtube.com/watch?v=${ID2}`)).toEqual({ videoId: ID2 });
  });
});

describe("parseYouTubeInput: path-style URLs", () => {
  it.each([
    ["https://youtu.be/dQw4w9WgXcQ"],
    ["https://www.youtu.be/dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ"],
    ["https://youtube.com/shorts/dQw4w9WgXcQ/"],
    ["https://m.youtube.com/shorts/dQw4w9WgXcQ?feature=share"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ?si=XyZ123"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ"],
    ["https://www.youtube.com/v/dQw4w9WgXcQ"],
    ["https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["https://youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0"],
  ])("%s", (input) => {
    expect(parseYouTubeInput(input)).toEqual({ videoId: ID });
  });
});

describe("parseYouTubeInput: extra params in any order", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=abc123"],
    ["https://www.youtube.com/watch?feature=share&v=dQw4w9WgXcQ"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1234567890&index=3"],
    ["https://www.youtube.com/watch?list=PL1234567890&index=3&v=dQw4w9WgXcQ&pp=ygUE"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc&feature=shared"],
    ["https://www.youtube.com/watch?app=desktop&v=dQw4w9WgXcQ"],
  ])("%s", (input) => {
    expect(parseYouTubeInput(input)).toEqual({ videoId: ID });
  });
});

describe("parseYouTubeInput: start times", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90", 90],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s", 90],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s", 90],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1h2m3s", 3723],
    ["https://www.youtube.com/watch?t=45&v=dQw4w9WgXcQ", 45],
    ["https://youtu.be/dQw4w9WgXcQ?t=90", 90],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc&t=2m", 120],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ?start=75", 75],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&start=30", 30],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=1m5s", 65],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=0", 0],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ?t=5", 5],
  ])("%s -> %i", (input, start) => {
    expect(parseYouTubeInput(input)).toEqual({ videoId: ID, startSeconds: start });
  });

  it("prefers t over start", () => {
    expect(parseYouTubeInput(`https://www.youtube.com/watch?v=${ID}&start=10&t=20`)).toEqual({
      videoId: ID,
      startSeconds: 20,
    });
  });

  it("ignores a time it cannot read but keeps the video", () => {
    expect(parseYouTubeInput(`https://www.youtube.com/watch?v=${ID}&t=abc`)).toEqual({ videoId: ID });
  });
});

describe("parseYouTubeInput: URLs inside other text", () => {
  it("Android share text", () => {
    expect(parseYouTubeInput(`Check this out https://youtu.be/${ID}?si=abc&t=90`)).toEqual({
      videoId: ID,
      startSeconds: 90,
    });
  });

  it("title on one line, URL on the next", () => {
    expect(parseYouTubeInput(`Never Gonna Give You Up\nhttps://www.youtube.com/watch?v=${ID}`)).toEqual({
      videoId: ID,
    });
  });

  it("URL followed by a full stop", () => {
    expect(parseYouTubeInput(`watch this: https://youtu.be/${ID}.`)).toEqual({ videoId: ID });
  });

  it("URL wrapped in brackets", () => {
    expect(parseYouTubeInput(`(https://youtu.be/${ID})`)).toEqual({ videoId: ID });
  });

  it("URL glued to a label", () => {
    expect(parseYouTubeInput(`link:https://youtu.be/${ID}`)).toEqual({ videoId: ID });
  });

  it("leading and trailing whitespace", () => {
    expect(parseYouTubeInput(`   https://youtu.be/${ID}   \n`)).toEqual({ videoId: ID });
  });

  it("skips a non-video link and takes the first video link", () => {
    expect(
      parseYouTubeInput(`https://example.com/page and https://youtu.be/${ID} or https://youtu.be/${ID2}`),
    ).toEqual({ videoId: ID });
  });
});

describe("parseYouTubeInput: missing https://", () => {
  it.each([
    ["youtube.com/watch?v=dQw4w9WgXcQ"],
    ["www.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["m.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["youtu.be/dQw4w9WgXcQ"],
    ["youtube.com/shorts/dQw4w9WgXcQ"],
  ])("%s", (input) => {
    expect(parseYouTubeInput(input)).toEqual({ videoId: ID });
  });

  it("keeps the time when the scheme is missing", () => {
    expect(parseYouTubeInput(`youtu.be/${ID}?t=1m`)).toEqual({ videoId: ID, startSeconds: 60 });
  });
});

describe("parseYouTubeInput: our own clip links", () => {
  it.each([
    [`https://justthisbit.vercel.app/c/${ID}/90-132`],
    [`https://justthisbit.vercel.app/c/${ID}/90-132?n=watch%20his%20face`],
    [`http://localhost:3000/c/${ID}/90-132`],
    [`justthisbit.vercel.app/c/${ID}/90-132/`],
  ])("%s", (input) => {
    expect(parseYouTubeInput(input)).toEqual({ videoId: ID, startSeconds: 90 });
  });

  it("rejects a clip link with an invalid range", () => {
    expect(parseYouTubeInput(`https://justthisbit.vercel.app/c/${ID}/132-90`)).toBeNull();
  });

  it("rejects a clip link with a bad id", () => {
    expect(parseYouTubeInput("https://justthisbit.vercel.app/c/short/90-132")).toBeNull();
  });
});

describe("parseYouTubeInput: returns null for anything else", () => {
  it.each([
    [""],
    ["   "],
    ["hello there"],
    ["dQw4w9WgXcQ"],
    ["https://www.youtube.com/"],
    ["https://www.youtube.com/playlist?list=PL1234567890"],
    ["https://www.youtube.com/watch?list=PL1234567890"],
    ["https://www.youtube.com/@SomeChannel"],
    ["https://www.youtube.com/channel/UC1234567890abcdefghij"],
    ["https://www.youtube.com/c/SomeChannel"],
    ["https://www.youtube.com/user/someone"],
    ["https://www.youtube.com/results?search_query=cats"],
    ["https://www.youtube.com/watch?v=tooShort"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQX"],
    ["https://www.youtube.com/watch?v=dQw4w9WgX!Q"],
    ["https://youtu.be/"],
    ["https://youtu.be/abc"],
    ["https://www.youtube.com/shorts/"],
    ["https://vimeo.com/123456789"],
    ["https://notyoutube.com/watch?v=dQw4w9WgXcQ"],
    ["https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ"],
    ["https://example.com/watch?v=dQw4w9WgXcQ"],
    ["javascript:alert(1)"],
    ["ftp://youtu.be/dQw4w9WgXcQ"],
  ])("%j", (input) => {
    expect(parseYouTubeInput(input)).toBeNull();
  });

  it("does not throw on non-string input", () => {
    expect(parseYouTubeInput(undefined as unknown as string)).toBeNull();
    expect(parseYouTubeInput(null as unknown as string)).toBeNull();
  });

  it("handles very long input without crashing", () => {
    expect(parseYouTubeInput("a ".repeat(50_000))).toBeNull();
  });
});
