import { describe, expect, it } from "vitest";
import { parseYouTubeInput, youtubeShortUrl } from "./youtube";

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

describe("youtubeShortUrl", () => {
  it("builds a youtu.be link with and without a start", () => {
    expect(youtubeShortUrl("dQw4w9WgXcQ")).toBe("https://youtu.be/dQw4w9WgXcQ");
    expect(youtubeShortUrl("dQw4w9WgXcQ", 0)).toBe("https://youtu.be/dQw4w9WgXcQ");
    expect(youtubeShortUrl("dQw4w9WgXcQ", 840)).toBe("https://youtu.be/dQw4w9WgXcQ?t=840");
    expect(youtubeShortUrl("dQw4w9WgXcQ", 90.7)).toBe("https://youtu.be/dQw4w9WgXcQ?t=90");
  });

  it("parses back to the same video and start", () => {
    expect(parseYouTubeInput(youtubeShortUrl("UF8uR6Z6KLc", 720))).toEqual({ videoId: "UF8uR6Z6KLc", startSeconds: 720 });
    expect(parseYouTubeInput(youtubeShortUrl("UF8uR6Z6KLc"))).toEqual({ videoId: "UF8uR6Z6KLc" });
  });
});

describe("parseYouTubeInput: Android share text from the YouTube app", () => {
  it("finds the video and start in 'Check this out' text", () => {
    expect(parseYouTubeInput("Check this out https://youtu.be/UF8uR6Z6KLc?si=abc&t=840")).toEqual({
      videoId: "UF8uR6Z6KLc",
      startSeconds: 840,
    });
  });
});

// SPEC 4.1, reviewed format by format in Phase 5.
describe("parseYouTubeInput: SPEC 4.1 coverage", () => {
  it.each([
    // m.youtube.com with &t= in every time form
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=90", 90],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=90s", 90],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s", 90],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=1h2m3s", 3723],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&si=abc&t=42&feature=share", 42],
    ["m.youtube.com/watch?v=dQw4w9WgXcQ&t=15", 15],
    // youtube.com/live with ?si=
    ["https://www.youtube.com/live/dQw4w9WgXcQ?si=AbC-123_xyz&t=600", 600],
    ["https://youtube.com/live/dQw4w9WgXcQ?si=AbC-123_xyz&t=1h", 3600],
    ["https://m.youtube.com/live/dQw4w9WgXcQ?t=30&si=AbC-123_xyz", 30],
    // music.youtube.com
    ["https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=RDAMVM&t=45", 45],
    // start= in every time form
    ["https://www.youtube.com/embed/dQw4w9WgXcQ?start=90s", 90],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ?start=1m30s", 90],
    ["https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=1h2m3s", 3723],
    // youtu.be with every time form
    ["https://youtu.be/dQw4w9WgXcQ?t=1h2m3s", 3723],
    ["https://youtu.be/dQw4w9WgXcQ?feature=shared&t=90s", 90],
    // shorts, /v/ with params
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ?si=abc&t=3", 3],
    ["https://www.youtube.com/v/dQw4w9WgXcQ?start=20&version=3", 20],
  ])("%s -> %i", (input, start) => {
    expect(parseYouTubeInput(input)).toEqual({ videoId: ID, startSeconds: start });
  });

  it.each([
    ["https://m.youtube.com/live/dQw4w9WgXcQ?si=XyZ123"],
    ["youtube.com/live/dQw4w9WgXcQ?si=XyZ123"],
    ["music.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["youtube-nocookie.com/embed/dQw4w9WgXcQ"],
    ["https://www.youtube.com/watch?pp=ygUEdGVzdA%3D%3D&index=2&list=PL123&si=x&feature=youtu.be&v=dQw4w9WgXcQ"],
  ])("%s", (input) => {
    expect(parseYouTubeInput(input)).toEqual({ videoId: ID });
  });

  it("Android share text with an m.youtube.com link and a time", () => {
    expect(parseYouTubeInput(`Watch this! https://m.youtube.com/watch?v=${ID}&t=1m30s`)).toEqual({
      videoId: ID,
      startSeconds: 90,
    });
  });

  it("live stream replay shared with words around it", () => {
    expect(parseYouTubeInput(`The best bit https://youtube.com/live/${ID}?si=AbC-123_xyz&t=5025 lol`)).toEqual({
      videoId: ID,
      startSeconds: 5025,
    });
  });

  it.each([
    ["https://www.youtube.com/embed/videoseries?list=PL1234567890"],
    ["https://www.youtube-nocookie.com/embed/videoseries?list=PL1234567890"],
    ["https://m.youtube.com/playlist?list=PL1234567890"],
    ["https://music.youtube.com/playlist?list=PL1234567890"],
    ["https://www.youtube.com/live/"],
    ["https://www.youtube.com/watch?v="],
    ["https://m.youtube.com/@SomeChannel"],
  ])("%s is not a video", (input) => {
    expect(parseYouTubeInput(input)).toBeNull();
  });
});
