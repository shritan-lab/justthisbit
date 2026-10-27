import { describe, expect, it } from "vitest";
import { START_TOLERANCE_SECONDS, crossedClipEnd, isInsideClip } from "./clip-end";

const START = 90;
const END = 132;

const sample = (mediaTime: number, wallTimeMs: number) => ({ mediaTime, wallTimeMs });

function crossed(prev: number, cur: number, elapsedMs = 200, playbackRate = 1) {
  return crossedClipEnd({
    previous: sample(prev, 1000),
    current: sample(cur, 1000 + elapsedMs),
    start: START,
    end: END,
    playbackRate,
  });
}

describe("isInsideClip", () => {
  it.each([
    [START, true],
    [START - START_TOLERANCE_SECONDS, true],
    [START - START_TOLERANCE_SECONDS - 0.01, false],
    [END - 0.01, true],
    [END, false],
    [END + 5, false],
  ])("%s -> %s", (t, expected) => {
    expect(isInsideClip(t, START, END)).toBe(expected);
  });
});

describe("crossedClipEnd", () => {
  it("fires when normal playback crosses end", () => {
    expect(crossed(131.9, 132.1)).toBe(true);
  });

  it("fires when playback lands exactly on end", () => {
    expect(crossed(131.8, 132)).toBe(true);
  });

  it("does not fire before end", () => {
    expect(crossed(131.5, 131.7)).toBe(false);
  });

  it("does not fire when already past end (viewer chose to keep watching)", () => {
    expect(crossed(132.2, 132.4)).toBe(false);
  });

  it("does not fire for a seek from inside the clip to past end", () => {
    expect(crossed(100, 300)).toBe(false);
  });

  it("does not fire for a short seek across end", () => {
    expect(crossed(130, 137)).toBe(false);
  });

  it("does not fire when playing in from before the clip and staying before end", () => {
    expect(crossed(50, 50.2)).toBe(false);
  });

  it("fires when the clip started a little early because of keyframes", () => {
    // A 1 second clip that YouTube started 0.5s early.
    expect(
      crossedClipEnd({ previous: sample(90.9, 0), current: sample(91.1, 200), start: 90.5, end: 91 }),
    ).toBe(true);
  });

  it("fires when a throttled background tab polls once a second", () => {
    expect(crossed(131.2, 132.2, 1000)).toBe(true);
  });

  it("fires when the tab was throttled for a full minute", () => {
    expect(crossed(100, 160, 60_000)).toBe(true);
  });

  it("allows for faster playback rates", () => {
    expect(crossed(131.8, 132.2, 200, 2)).toBe(true);
    expect(crossed(130, 132.6, 1000, 2)).toBe(true);
  });

  it("treats a bad playback rate as 1x", () => {
    expect(crossed(131.9, 132.1, 200, Number.NaN)).toBe(true);
    expect(crossed(131.9, 132.1, 200, 0)).toBe(true);
    expect(crossed(100, 300, 200, -1)).toBe(false);
  });

  it("ignores a wall clock that went backwards", () => {
    expect(crossed(131.9, 132.1, -500)).toBe(true);
    expect(crossed(120, 140, -500)).toBe(false);
  });
});
