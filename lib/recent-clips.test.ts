import { describe, expect, it } from "vitest";
import {
  MAX_RECENT_CLIPS,
  RECENT_CLIPS_KEY,
  addRecentClip,
  clearRecentClips,
  readRecentClips,
  writeRecentClips,
  type RecentClip,
  type StorageLike,
} from "./recent-clips";

const SITE = "https://justthisbit.vercel.app";
const ID = "dQw4w9WgXcQ";

function clip(start: number, extra: Partial<RecentClip> = {}): RecentClip {
  return { url: `${SITE}/c/${ID}/${start}-${start + 30}`, title: "A video", start, end: start + 30, ...extra };
}

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k]! : null),
    setItem: (k, v) => {
      data[k] = String(v);
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

const throwingStorage: StorageLike = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
};

describe("readRecentClips", () => {
  it("returns [] with no storage, nothing saved, or junk", () => {
    expect(readRecentClips(null)).toEqual([]);
    expect(readRecentClips(memoryStorage())).toEqual([]);
    expect(readRecentClips(memoryStorage({ [RECENT_CLIPS_KEY]: "{not json" }))).toEqual([]);
    expect(readRecentClips(memoryStorage({ [RECENT_CLIPS_KEY]: '{"a":1}' }))).toEqual([]);
  });

  it("returns [] when storage throws", () => {
    expect(readRecentClips(throwingStorage)).toEqual([]);
  });

  it("drops entries that are not real clip links", () => {
    const stored = [
      clip(10),
      { ...clip(20), url: "javascript:alert(1)" },
      { ...clip(30), url: `${SITE}/c/${ID}/90-10` },
      { ...clip(40), end: 40 },
      { title: "no url", start: 0, end: 1 },
      clip(50),
    ];
    const list = readRecentClips(memoryStorage({ [RECENT_CLIPS_KEY]: JSON.stringify(stored) }));
    expect(list.map((c) => c.start)).toEqual([10, 50]);
  });

  it("keeps at most 20", () => {
    const stored = Array.from({ length: 30 }, (_, i) => clip(i * 100));
    expect(readRecentClips(memoryStorage({ [RECENT_CLIPS_KEY]: JSON.stringify(stored) }))).toHaveLength(MAX_RECENT_CLIPS);
  });
});

describe("writeRecentClips and clearRecentClips", () => {
  it("round-trips through storage", () => {
    const storage = memoryStorage();
    const list = [clip(10, { note: "the dots connect 👀" }), clip(20)];
    expect(writeRecentClips(storage, list)).toBe(true);
    expect(readRecentClips(storage)).toEqual(list);
    expect(clearRecentClips(storage)).toBe(true);
    expect(readRecentClips(storage)).toEqual([]);
  });

  it("reports failure instead of throwing", () => {
    expect(writeRecentClips(null, [clip(1)])).toBe(false);
    expect(writeRecentClips(throwingStorage, [clip(1)])).toBe(false);
    expect(clearRecentClips(null)).toBe(false);
    expect(clearRecentClips(throwingStorage)).toBe(false);
  });
});

describe("addRecentClip", () => {
  it("puts the newest first", () => {
    expect(addRecentClip([clip(10)], clip(20)).map((c) => c.start)).toEqual([20, 10]);
  });

  it("moves an existing link to the top instead of duplicating it", () => {
    const list = [clip(10), clip(20), clip(30)];
    expect(addRecentClip(list, clip(30)).map((c) => c.start)).toEqual([30, 10, 20]);
  });

  it("keeps the newest 20", () => {
    let list: RecentClip[] = [];
    for (let i = 0; i < 25; i++) list = addRecentClip(list, clip(i * 100));
    expect(list).toHaveLength(MAX_RECENT_CLIPS);
    expect(list[0]!.start).toBe(2400);
  });

  it("ignores an invalid clip", () => {
    const list = [clip(10)];
    expect(addRecentClip(list, { ...clip(20), url: "https://example.com/" })).toBe(list);
  });
});
