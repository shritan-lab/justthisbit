import { describe, expect, it } from "vitest";
import { boxesOverlap, floatingSpot, isVisibleBox, pageKindOf, videoIdOf, type Box } from "./youtube-page";

const ID = "dQw4w9WgXcQ";

describe("pageKindOf", () => {
  it("knows watch, live and shorts pages", () => {
    expect(pageKindOf("/watch")).toBe("watch");
    expect(pageKindOf(`/live/${ID}`)).toBe("watch");
    expect(pageKindOf(`/shorts/${ID}`)).toBe("shorts");
  });

  it("is null for every other page", () => {
    for (const path of ["/", "/feed/subscriptions", "/@channel", "/results", "/shorts", "/playlist", `/embed/${ID}`]) {
      expect(pageKindOf(path)).toBeNull();
    }
  });
});

describe("videoIdOf", () => {
  it("reads the video from watch, live and shorts URLs", () => {
    expect(videoIdOf(`https://www.youtube.com/watch?v=${ID}&t=90s&list=PL1`)).toBe(ID);
    expect(videoIdOf(`https://www.youtube.com/live/${ID}?si=abc`)).toBe(ID);
    expect(videoIdOf(`https://www.youtube.com/shorts/${ID}`)).toBe(ID);
  });

  it("is null without a valid video", () => {
    expect(videoIdOf("https://www.youtube.com/")).toBeNull();
    expect(videoIdOf("https://www.youtube.com/watch")).toBeNull();
    expect(videoIdOf("https://www.youtube.com/watch?v=short")).toBeNull();
    expect(videoIdOf("https://www.youtube.com/playlist?list=PL1")).toBeNull();
    expect(videoIdOf(`https://www.youtube.com/embed/${ID}`)).toBeNull();
    expect(videoIdOf("not a url")).toBeNull();
  });
});

const b = (left: number, top: number, right: number, bottom: number): Box => ({ left, top, right, bottom });

describe("boxes", () => {
  it("detects overlap, and edges touching is not overlap", () => {
    expect(boxesOverlap(b(0, 0, 10, 10), b(5, 5, 15, 15))).toBe(true);
    expect(boxesOverlap(b(0, 0, 10, 10), b(10, 0, 20, 10))).toBe(false);
    expect(boxesOverlap(b(0, 0, 10, 10), b(0, 20, 10, 30))).toBe(false);
  });

  it("treats zero-size boxes as hidden", () => {
    expect(isVisibleBox(b(0, 0, 0, 0))).toBe(false);
    expect(isVisibleBox(b(0, 0, 1, 1))).toBe(true);
  });
});

describe("floatingSpot", () => {
  const video = b(700, 60, 1040, 660);
  const actions = b(1052, 300, 1100, 660);
  const panel = { width: 340, height: 500 };

  it("goes right of the action bar when there is room", () => {
    const spot = floatingSpot({ viewport: { width: 1600, height: 900 }, video, actions, panel });
    expect(spot).toEqual({ left: 1116, top: 300 });
  });

  it("goes left of the video when the right is too narrow", () => {
    const spot = floatingSpot({ viewport: { width: 1300, height: 900 }, video, actions, panel });
    expect(spot).toEqual({ left: 700 - 16 - 340, top: 300 });
  });

  it("is null when neither side has room", () => {
    const narrowVideo = b(284, 64, 611, 646);
    const narrowActions = b(623, 286, 671, 646);
    expect(floatingSpot({ viewport: { width: 919, height: 678 }, video: narrowVideo, actions: narrowActions, panel })).toBeNull();
  });

  it("keeps the panel inside the window vertically", () => {
    const spot = floatingSpot({ viewport: { width: 1600, height: 600 }, video, actions, panel });
    expect(spot?.top).toBe(600 - 500 - 16);
  });

  it("never overlaps the video", () => {
    for (const width of [1200, 1300, 1400, 1600, 1920]) {
      const spot = floatingSpot({ viewport: { width, height: 900 }, video, actions, panel });
      if (!spot) continue;
      const placed = b(spot.left, spot.top, spot.left + panel.width, spot.top + panel.height);
      expect(boxesOverlap(placed, video)).toBe(false);
      expect(boxesOverlap(placed, actions)).toBe(false);
    }
  });
});
