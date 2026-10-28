import { describe, expect, it } from "vitest";
import { bookmarkletSource, buildBookmarklet } from "./bookmarklet";

const ORIGIN = "https://justthisbit.vercel.app";
const ID = "UF8uR6Z6KLc";

type Run = { opened: string[]; alerts: string[] };

/** Runs the bookmarklet as a browser would: decode the javascript: URL, then execute it on `href`. */
function runOn(href: string, currentTime?: number, selector = "video"): Run {
  const code = buildBookmarklet(ORIGIN);
  expect(code.startsWith("javascript:")).toBe(true);
  const source = decodeURIComponent(code.slice("javascript:".length));

  const url = new URL(href);
  const run: Run = { opened: [], alerts: [] };
  const video = currentTime === undefined ? null : { currentTime };
  const fakeDocument = { querySelector: (s: string) => (s === selector ? video : null) };
  const fakeWindow = { open: (target: string, name: string) => run.opened.push(`${name} ${target}`) };
  const location = { hostname: url.hostname, pathname: url.pathname, search: url.search };

  new Function("location", "document", "window", "alert", source)(location, fakeDocument, fakeWindow, (msg: string) =>
    run.alerts.push(msg),
  );
  return run;
}

describe("bookmarklet", () => {
  it("opens a watch page at the current time, rounded down", () => {
    expect(runOn(`https://www.youtube.com/watch?v=${ID}&list=abc`, 840.9, "#movie_player video")).toEqual({
      opened: [`_blank ${ORIGIN}/?v=${ID}&t=840`],
      alerts: [],
    });
  });

  it("works on Shorts", () => {
    expect(runOn(`https://www.youtube.com/shorts/${ID}`, 7.2, "#shorts-player video").opened).toEqual([
      `_blank ${ORIGIN}/?v=${ID}&t=7`,
    ]);
  });

  it("works on live replays", () => {
    expect(runOn(`https://www.youtube.com/live/${ID}?si=x`, 3600).opened).toEqual([`_blank ${ORIGIN}/?v=${ID}&t=3600`]);
  });

  it("works on youtube.com without www and on music.youtube.com", () => {
    expect(runOn(`https://youtube.com/watch?v=${ID}`, 1).opened).toEqual([`_blank ${ORIGIN}/?v=${ID}&t=1`]);
    expect(runOn(`https://music.youtube.com/watch?v=${ID}`, 2).opened).toEqual([`_blank ${ORIGIN}/?v=${ID}&t=2`]);
  });

  it("uses 0 when there is no video element", () => {
    expect(runOn(`https://www.youtube.com/watch?v=${ID}`).opened).toEqual([`_blank ${ORIGIN}/?v=${ID}&t=0`]);
  });

  it.each([
    "https://www.youtube.com/",
    "https://www.youtube.com/@somechannel",
    "https://www.youtube.com/watch?v=short",
    "https://www.youtube.com/playlist?list=PL123",
    `https://notyoutube.com/watch?v=${ID}`,
    `https://example.com/shorts/${ID}`,
  ])("says 'Open a YouTube video first' on %s", (href) => {
    expect(runOn(href, 10)).toEqual({ opened: [], alerts: ["Open a YouTube video first"] });
  });

  it("injects the origin without a trailing slash", () => {
    expect(bookmarkletSource(`${ORIGIN}/`)).toContain(`"${ORIGIN}"+"/?v="`);
  });

  it("encodes characters a URL would otherwise cut off", () => {
    const code = buildBookmarklet(ORIGIN);
    expect(code).not.toMatch(/[#\s"]/);
    expect(code).toMatch(/^javascript:\(function\(\)/);
  });
});
