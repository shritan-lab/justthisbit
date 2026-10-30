import { describe, expect, it } from "vitest";
import { isClipPath, notFoundScript } from "./not-found";

/** Runs the inline script against a fake page at `pathname`. Returns what it changed. */
function run(pathname: string, { withElement = true } = {}) {
  const attrs: Record<string, string> = { "data-kind": "clip" };
  const element = { setAttribute: (name: string, value: string) => (attrs[name] = value) };
  const document = { getElementById: (id: string) => (withElement && id === "nf" ? element : null) };
  new Function("location", "document", notFoundScript("nf"))({ pathname }, document);
  return attrs["data-kind"];
}

describe("notFoundScript", () => {
  it.each(["/c", "/c/", "/c/not-an-id/90-132", "/c/dQw4w9WgXcQ/132-90", "/c/dQw4w9WgXcQ"])(
    "keeps the broken clip message on %s",
    (path) => {
      expect(run(path)).toBe("clip");
      expect(isClipPath(path)).toBe(true);
    },
  );

  it.each(["/no-such-page", "/cats", "/clips", "/install/extra", "/C/dQw4w9WgXcQ/90-132", "/x/c/abc"])(
    "switches to the page-not-found message on %s",
    (path) => {
      expect(run(path)).toBe("page");
      expect(isClipPath(path)).toBe(false);
    },
  );

  it("never throws, even without its element", () => {
    expect(() => run("/no-such-page", { withElement: false })).not.toThrow();
  });

  it("is valid JavaScript with no backslashes or HTML-breaking characters", () => {
    const script = notFoundScript("not-found");
    expect(() => new Function(script)).not.toThrow();
    expect(script).not.toMatch(/[\\<>]/);
  });
});
