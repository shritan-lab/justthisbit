import { describe, expect, it } from "vitest";
import { isTypingElement, keyTarget, matchShortcut } from "./shortcuts";

const key = (code: string, mods: Partial<Record<"altKey" | "shiftKey" | "ctrlKey" | "metaKey", boolean>> = {}, k = "") => ({
  altKey: true,
  shiftKey: true,
  ctrlKey: false,
  metaKey: false,
  ...mods,
  code,
  key: k,
});

describe("matchShortcut", () => {
  it("maps Alt+Shift+S, E and C", () => {
    expect(matchShortcut(key("KeyS"))).toBe("start");
    expect(matchShortcut(key("KeyE"))).toBe("end");
    expect(matchShortcut(key("KeyC"))).toBe("copy");
  });

  it("needs both Alt and Shift, and nothing else", () => {
    expect(matchShortcut(key("KeyS", { altKey: false }))).toBeNull();
    expect(matchShortcut(key("KeyS", { shiftKey: false }))).toBeNull();
    expect(matchShortcut(key("KeyS", { ctrlKey: true }))).toBeNull();
    expect(matchShortcut(key("KeyS", { metaKey: true }))).toBeNull();
  });

  it("ignores other letters", () => {
    expect(matchShortcut(key("KeyK"))).toBeNull();
    expect(matchShortcut(key("Digit1"))).toBeNull();
  });

  it("falls back to the key when there is no code", () => {
    expect(matchShortcut(key("", {}, "S"))).toBe("start");
    expect(matchShortcut(key("", {}, "Shift"))).toBeNull();
  });

  it("uses the physical key, not the character Alt produces", () => {
    expect(matchShortcut(key("KeyS", {}, "ß"))).toBe("start");
  });
});

describe("isTypingElement", () => {
  it("is true for inputs, text areas, selects and editable text", () => {
    expect(isTypingElement({ tagName: "INPUT" })).toBe(true);
    expect(isTypingElement({ tagName: "textarea" })).toBe(true);
    expect(isTypingElement({ tagName: "SELECT" })).toBe(true);
    expect(isTypingElement({ tagName: "DIV", isContentEditable: true })).toBe(true);
  });

  it("is false for everything else", () => {
    expect(isTypingElement({ tagName: "BUTTON" })).toBe(false);
    expect(isTypingElement({ tagName: "DIV", isContentEditable: false })).toBe(false);
    expect(isTypingElement(null)).toBe(false);
    expect(isTypingElement(undefined)).toBe(false);
  });
});

describe("keyTarget", () => {
  it("uses the first entry of the composed path (the real field inside a shadow root)", () => {
    const input = { tagName: "INPUT" };
    const host = { tagName: "DIV" };
    const event = { composedPath: () => [input, host], target: host } as unknown as Event;
    expect(keyTarget(event)).toBe(input);
  });

  it("falls back to the target", () => {
    const target = { tagName: "BODY" };
    expect(keyTarget({ composedPath: () => [], target } as unknown as Event)).toBe(target);
  });
});
