import { z } from "zod";
import { MAX_NOTE_LENGTH, isClipUrl } from "./clip";

// Recent clips live in this device's localStorage only (SPEC 5.2). Every storage call can throw
// (private mode, blocked site data, quota), so each one is wrapped and the app works without it.

export const RECENT_CLIPS_KEY = "jtb:recent-clips:v1";
export const MAX_RECENT_CLIPS = 20;
const MAX_TITLE_LENGTH = 200;

export type RecentClip = {
  url: string;
  title: string;
  start: number;
  end: number;
  note?: string;
};

/** The part of the Storage interface we use, so tests can pass a fake. */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const seconds = z.number().int().nonnegative().max(999_999_999);

// Stored data is untrusted: anything can be written to localStorage. `url` must be a real
// clip link before it is ever used as an href.
const entrySchema = z
  .object({
    url: z.string().refine(isClipUrl),
    title: z.string().max(1000).transform((t) => t.trim().slice(0, MAX_TITLE_LENGTH)),
    start: seconds,
    end: seconds,
    note: z.string().max(MAX_NOTE_LENGTH * 4).optional(),
  })
  .refine((e) => e.end > e.start);

function parseEntries(value: unknown): RecentClip[] {
  if (!Array.isArray(value)) return [];
  const out: RecentClip[] = [];
  for (const item of value) {
    const parsed = entrySchema.safeParse(item);
    if (!parsed.success) continue;
    const { note, ...rest } = parsed.data;
    out.push(note ? { ...rest, note } : rest);
    if (out.length >= MAX_RECENT_CLIPS) break;
  }
  return out;
}

/** Reads the saved list. Returns [] when storage is missing, blocked, empty or corrupt. */
export function readRecentClips(storage: StorageLike | null): RecentClip[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(RECENT_CLIPS_KEY);
    return raw ? parseEntries(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

/** Saves the list. Returns false when storage is missing or refuses the write. */
export function writeRecentClips(storage: StorageLike | null, clips: RecentClip[]): boolean {
  if (!storage) return false;
  try {
    storage.setItem(RECENT_CLIPS_KEY, JSON.stringify(clips.slice(0, MAX_RECENT_CLIPS)));
    return true;
  } catch {
    return false;
  }
}

/** Removes the list. Returns false when storage is missing or refuses. */
export function clearRecentClips(storage: StorageLike | null): boolean {
  if (!storage) return false;
  try {
    storage.removeItem(RECENT_CLIPS_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Puts `clip` first, drops an older copy of the same link, and keeps the newest 20. */
export function addRecentClip(list: RecentClip[], clip: RecentClip): RecentClip[] {
  const [entry] = parseEntries([clip]);
  if (!entry) return list;
  return [entry, ...list.filter((c) => c.url !== entry.url)].slice(0, MAX_RECENT_CLIPS);
}
