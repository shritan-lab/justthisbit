import { describe, expect, it } from "vitest";
import { formatClock, formatDuration, parseKeypadTimeInput, parseTimeInput } from "./time";

describe("parseKeypadTimeInput", () => {
  it.each([
    ["302", 302],
    ["5:02", 302],
    ["1:05:30", 3930],
    ["5.02", 302],
    ["5,02", 302],
    ["1.05.30", 3930],
    ["1,05,30", 3930],
    [" 5.02 ", 302],
    ["0.00", 0],
    ["1m30s", 90],
  ])("%j -> %i", (input, expected) => {
    expect(parseKeypadTimeInput(input)).toBe(expected);
  });

  it.each(["", "abc", "5.", ".5", "5..02", "5.60", "1.2.3.4", "5.02:10", "-5", "5:02.5", "1.5e3"])(
    "%j -> null",
    (input) => {
      expect(parseKeypadTimeInput(input)).toBeNull();
    },
  );

  it("returns null for non-string input", () => {
    expect(parseKeypadTimeInput(42 as unknown as string)).toBeNull();
  });
});

describe("parseTimeInput", () => {
  it.each([
    ["0", 0],
    ["1", 1],
    ["90", 90],
    ["3600", 3600],
    ["3601", 3601],
    ["90s", 90],
    ["0:00", 0],
    ["0:01", 1],
    ["1:30", 90],
    ["1:5", 65],
    ["59:59", 3599],
    ["60:00", 3600],
    ["90:00", 5400],
    ["01:02:03", 3723],
    ["1:00:00", 3600],
    ["1:00:01", 3601],
    ["1m30s", 90],
    ["1m", 60],
    ["2h", 7200],
    ["1h2m3s", 3723],
    ["1h3s", 3603],
    ["90m", 5400],
    ["1m 30s", 90],
    ["1h 2m", 3720],
    ["  1:30  ", 90],
    ["1M30S", 90],
  ])("%j -> %i", (input, seconds) => {
    expect(parseTimeInput(input)).toBe(seconds);
  });

  it.each([
    [""],
    ["   "],
    ["abc"],
    ["-5"],
    ["1.5"],
    ["1e3"],
    ["1:60"],
    ["1:30:60"],
    ["1:60:00"],
    [":30"],
    ["1:"],
    ["1:2:3:4"],
    ["1:300"],
    ["30s1m"],
    ["1x"],
    ["h"],
    ["1h2m3s4"],
    ["99999999999999999999"],
  ])("%j -> null", (input) => {
    expect(parseTimeInput(input)).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(parseTimeInput(undefined as unknown as string)).toBeNull();
  });
});

describe("formatClock", () => {
  it.each([
    [0, "0:00"],
    [1, "0:01"],
    [42, "0:42"],
    [59, "0:59"],
    [60, "1:00"],
    [90, "1:30"],
    [599, "9:59"],
    [600, "10:00"],
    [3599, "59:59"],
    [3600, "1:00:00"],
    [3601, "1:00:01"],
    [3723, "1:02:03"],
    [36000, "10:00:00"],
    [90.9, "1:30"],
    [-5, "0:00"],
    [Number.NaN, "0:00"],
    [Number.POSITIVE_INFINITY, "0:00"],
  ])("%d -> %s", (seconds, text) => {
    expect(formatClock(seconds)).toBe(text);
  });

  it("round-trips with parseTimeInput", () => {
    for (const s of [0, 1, 59, 60, 90, 3599, 3600, 3723, 86399]) {
      expect(parseTimeInput(formatClock(s))).toBe(s);
    }
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0s"],
    [1, "1s"],
    [42, "42s"],
    [59, "59s"],
    [60, "1m"],
    [90, "1m 30s"],
    [3599, "59m 59s"],
    [3600, "1h"],
    [3601, "1h"],
    [3660, "1h 1m"],
    [3723, "1h 2m"],
    [7200, "2h"],
    [42.7, "42s"],
    [-1, "0s"],
    [Number.NaN, "0s"],
  ])("%d -> %s", (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text);
  });
});
