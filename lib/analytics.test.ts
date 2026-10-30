import { describe, expect, it } from "vitest";
import { scrubAnalyticsEvent, stripPrivateParams } from "./analytics";

const SITE = "https://justthisbit.vercel.app";

describe("stripPrivateParams", () => {
  it("removes the note from a clip link", () => {
    expect(stripPrivateParams(`${SITE}/c/dQw4w9WgXcQ/90-132?n=watch%20his%20face`)).toBe(
      `${SITE}/c/dQw4w9WgXcQ/90-132`,
    );
  });

  it("removes notes with emoji, newlines and reserved characters", () => {
    const note = encodeURIComponent("look 😂\nat this & that #1 ?");
    expect(stripPrivateParams(`${SITE}/c/dQw4w9WgXcQ/90-132?n=${note}`)).toBe(`${SITE}/c/dQw4w9WgXcQ/90-132`);
  });

  it("removes every copy of a repeated note", () => {
    expect(stripPrivateParams(`${SITE}/c/dQw4w9WgXcQ/90-132?n=a&n=b`)).toBe(`${SITE}/c/dQw4w9WgXcQ/90-132`);
  });

  it("removes raw shared text from the create page but keeps the video and time", () => {
    expect(stripPrivateParams(`${SITE}/?url=${encodeURIComponent("my private message")}`)).toBe(`${SITE}/`);
    expect(stripPrivateParams(`${SITE}/?v=dQw4w9WgXcQ&t=90`)).toBe(`${SITE}/?v=dQw4w9WgXcQ&t=90`);
  });

  it("keeps other params", () => {
    expect(stripPrivateParams(`${SITE}/c/dQw4w9WgXcQ/90-132?utm_source=x&n=secret`)).toBe(
      `${SITE}/c/dQw4w9WgXcQ/90-132?utm_source=x`,
    );
  });

  it("leaves URLs without private params alone", () => {
    expect(stripPrivateParams(`${SITE}/install`)).toBe(`${SITE}/install`);
    expect(stripPrivateParams(`${SITE}/c/dQw4w9WgXcQ/90-132`)).toBe(`${SITE}/c/dQw4w9WgXcQ/90-132`);
  });

  it("returns null for something that is not a URL", () => {
    expect(stripPrivateParams("not a url")).toBeNull();
    expect(stripPrivateParams("")).toBeNull();
  });
});

describe("scrubAnalyticsEvent", () => {
  it("returns the event with a clean URL", () => {
    expect(scrubAnalyticsEvent({ type: "pageview", url: `${SITE}/c/dQw4w9WgXcQ/90-132?n=hi` })).toEqual({
      type: "pageview",
      url: `${SITE}/c/dQw4w9WgXcQ/90-132`,
    });
  });

  it("drops an event whose URL cannot be read", () => {
    expect(scrubAnalyticsEvent({ type: "pageview", url: "::" })).toBeNull();
  });
});
