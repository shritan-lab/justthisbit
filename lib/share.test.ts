import { describe, expect, it } from "vitest";
import { shareTitle, whatsappShareUrl } from "./share";

const URL_ = "https://justthisbit.vercel.app/c/UF8uR6Z6KLc/720-750?n=the%20dots%20connect%20%F0%9F%91%80";

describe("whatsappShareUrl", () => {
  it("sends just the link when there is no note", () => {
    expect(whatsappShareUrl(URL_)).toBe(`https://wa.me/?text=${encodeURIComponent(URL_)}`);
    expect(whatsappShareUrl(URL_, "   ")).toBe(`https://wa.me/?text=${encodeURIComponent(URL_)}`);
  });

  it("puts the note on its own line above the link", () => {
    const href = whatsappShareUrl(URL_, "the dots connect 👀");
    expect(href).toBe(`https://wa.me/?text=${encodeURIComponent(`the dots connect 👀\n${URL_}`)}`);
    expect(new URL(href).searchParams.get("text")).toBe(`the dots connect 👀\n${URL_}`);
  });

  it("survives &, # and ? in the note", () => {
    const href = whatsappShareUrl(URL_, "a & b #1?");
    expect(new URL(href).searchParams.get("text")).toBe(`a & b #1?\n${URL_}`);
  });
});

describe("shareTitle", () => {
  it("matches the clip page title format", () => {
    expect(shareTitle(30, "Steve Jobs speech")).toBe("▶ 0:30 clip · Steve Jobs speech");
    expect(shareTitle(42)).toBe("▶ 0:42 clip");
    expect(shareTitle(42, "  ")).toBe("▶ 0:42 clip");
  });
});
