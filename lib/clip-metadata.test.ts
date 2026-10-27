import { describe, expect, it } from "vitest";
import { clipDescription, clipMetadata, clipTitle } from "./clip-metadata";

const clip = { videoId: "dQw4w9WgXcQ", start: 90, end: 132 };
const meta = { title: "Never Gonna Give You Up", authorName: "Rick Astley" };
const SITE = "https://justthisbit.vercel.app";

describe("clipTitle", () => {
  it("uses the clip length and the video title", () => {
    expect(clipTitle(clip, meta)).toBe("▶ 0:42 clip · Never Gonna Give You Up");
  });

  it("falls back when the title is unknown", () => {
    expect(clipTitle(clip, null)).toBe("▶ 0:42 YouTube clip");
  });

  it("formats long clips as a clock", () => {
    expect(clipTitle({ ...clip, start: 0, end: 3600 }, null)).toBe("▶ 1:00:00 YouTube clip");
  });
});

describe("clipDescription", () => {
  it("prefers the note", () => {
    expect(clipDescription({ ...clip, note: "watch his face 😂 & laugh" }, meta)).toBe("watch his face 😂 & laugh");
  });

  it("describes the range, title and channel", () => {
    expect(clipDescription(clip, meta)).toBe('From 1:30 to 2:12 of "Never Gonna Give You Up" by Rick Astley');
  });

  it("leaves out the channel when it is empty", () => {
    expect(clipDescription(clip, { title: "A video", authorName: "" })).toBe('From 1:30 to 2:12 of "A video"');
  });

  it("falls back when the title is unknown", () => {
    expect(clipDescription(clip, null)).toBe("From 1:30 to 2:12 of a YouTube video");
  });
});

describe("clipMetadata", () => {
  const md = clipMetadata({ ...clip, note: "hi & bye" }, meta, SITE);

  it("sets an absolute title and the note as description", () => {
    expect(md.title).toEqual({ absolute: "▶ 0:42 clip · Never Gonna Give You Up" });
    expect(md.description).toBe("hi & bye");
  });

  it("is noindex", () => {
    expect(md.robots).toEqual({ index: false });
  });

  it("uses the site URL as metadataBase", () => {
    expect(md.metadataBase?.toString()).toBe(`${SITE}/`);
  });

  it("sets the Open Graph video tags with the hqdefault thumbnail", () => {
    expect(md.openGraph).toMatchObject({
      type: "video.other",
      title: "▶ 0:42 clip · Never Gonna Give You Up",
      description: "hi & bye",
      url: "/c/dQw4w9WgXcQ/90-132?n=hi%20%26%20bye",
      images: [{ url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg", width: 480, height: 360 }],
    });
  });

  it("uses a large image Twitter card", () => {
    expect(md.twitter).toMatchObject({ card: "summary_large_image" });
  });
});
