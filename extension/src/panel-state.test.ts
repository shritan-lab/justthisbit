import { describe, expect, it } from "vitest";
import { DRAFT_MESSAGES } from "../../lib/clip-draft";
import {
  DEFAULT_LENGTH_SECONDS,
  LENGTH_CHIPS,
  openState,
  tidyTimes,
  viewOf,
  withEndNow,
  withEndText,
  withLength,
  withNote,
  withStartNow,
  withStartText,
} from "./panel-state";
import { EXTENSION_SITE_URL } from "./site";

const ID = "dQw4w9WgXcQ";

describe("openState", () => {
  it("starts at the current time, rounded down, and ends 30 seconds later", () => {
    expect(openState(83.9)).toEqual({ startText: "1:23", endText: "1:53", note: "", followLength: 30 });
    expect(DEFAULT_LENGTH_SECONDS).toBe(30);
  });

  it("starts at 0 when the time is unknown or bad", () => {
    for (const t of [null, Number.NaN, -5, Number.POSITIVE_INFINITY]) {
      expect(openState(t).startText).toBe("0:00");
      expect(openState(t).endText).toBe("0:30");
    }
  });

  it("formats long videos with hours", () => {
    expect(openState(3725).startText).toBe("1:02:05");
  });
});

describe("start, end and chips", () => {
  it("moves the end with the start while it follows", () => {
    const s = withStartText(openState(60), "2:00");
    expect(s.endText).toBe("2:30");
  });

  it("keeps the end where it is once it was set by hand", () => {
    const s = withStartText(withEndText(openState(60), "1:45"), "1:10");
    expect(s.endText).toBe("1:45");
    expect(s.followLength).toBeNull();
  });

  it("Set to now rounds the start down and the end up", () => {
    const s = withEndNow(withStartNow(openState(0), 90.7), 120.2);
    expect(s.startText).toBe("1:30");
    expect(s.endText).toBe("2:01");
  });

  it("start now keeps the length while the end follows", () => {
    expect(withStartNow(openState(0), 200).endText).toBe("3:50");
  });

  it("length chips set end = start + chip and follow again", () => {
    const chips = LENGTH_CHIPS.map((c) => c.seconds);
    expect(chips).toEqual([15, 30, 60, 120]);
    const s = withLength(withEndText(openState(90), "5:00"), 120);
    expect(s.endText).toBe("3:30");
    expect(withStartText(s, "2:00").endText).toBe("4:00");
  });

  it("length chips do nothing while the start is not a time", () => {
    const s = withStartText(openState(90), "abc");
    expect(withLength(s, 15)).toBe(s);
  });

  it("tidies typed times into clock times", () => {
    const s = tidyTimes({ startText: "90", endText: "2m", note: "", followLength: null });
    expect(s.startText).toBe("1:30");
    expect(s.endText).toBe("2:00");
    expect(tidyTimes({ startText: "x", endText: "1h", note: "", followLength: null }).startText).toBe("x");
  });

  it("cuts the note to 140 characters", () => {
    expect(withNote(openState(0), "a".repeat(200)).note).toHaveLength(140);
  });
});

describe("viewOf", () => {
  it("builds the production link in the /c/{id}/{start}-{end} format", () => {
    const view = viewOf(openState(90), ID);
    expect(view.url).toBe(`https://justthisbit.vercel.app/c/${ID}/90-120`);
    expect(EXTENSION_SITE_URL).toBe("https://justthisbit.vercel.app");
    expect(view.lengthText).toBe("0:30 clip");
    expect(view.rangeText).toBe("1:30 to 2:00");
    expect(view.activeChip).toBe(30);
  });

  it("adds the trimmed note as ?n=", () => {
    const view = viewOf(withNote(openState(90), "  watch his face & laugh?  "), ID);
    expect(view.url).toBe(`https://justthisbit.vercel.app/c/${ID}/90-120?n=watch%20his%20face%20%26%20laugh%3F`);
  });

  it("shows the same messages as the create page", () => {
    const badStart = viewOf(withStartText(openState(0), "soon"), ID);
    expect(badStart.url).toBeNull();
    expect(badStart.startError).toBe(DRAFT_MESSAGES.bad_start);
    expect(badStart.lengthText).toBe("No clip yet");

    const badEnd = viewOf(withEndText(openState(0), "later"), ID);
    expect(badEnd.endError).toBe(DRAFT_MESSAGES.bad_end);

    const backwards = viewOf(withEndText(openState(100), "1:00"), ID);
    expect(backwards.rangeError).toBe(DRAFT_MESSAGES.end_before_start);

    const same = viewOf(withEndText(openState(100), "1:40"), ID);
    expect(same.rangeError).toBe(DRAFT_MESSAGES.end_before_start);

    const tooLong = viewOf(withEndText(openState(0), "1:00:01"), ID);
    expect(tooLong.rangeError).toBe(DRAFT_MESSAGES.too_long);
  });

  it("allows exactly 60 minutes and exactly 1 second", () => {
    expect(viewOf(withEndText(openState(0), "1:00:00"), ID).url).toBe(`https://justthisbit.vercel.app/c/${ID}/0-3600`);
    expect(viewOf(withEndText(openState(10), "0:11"), ID).url).toBe(`https://justthisbit.vercel.app/c/${ID}/10-11`);
  });

  it("refuses a bad video id", () => {
    expect(viewOf(openState(0), "not-an-id").rangeError).toBe(DRAFT_MESSAGES.bad_video);
  });

  it("counts the note like the clip page does", () => {
    const view = viewOf(withNote(openState(0), "😀😀"), ID);
    expect(view.noteCount).toBe(2);
    expect(view.noteMax).toBe(140);
  });

  it("marks no chip for a length that is not a chip", () => {
    expect(viewOf(withEndText(openState(0), "0:45"), ID).activeChip).toBeNull();
  });
});
