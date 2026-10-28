"use client";

import { useSyncExternalStore } from "react";
import {
  RECENT_CLIPS_KEY,
  addRecentClip,
  clearRecentClips,
  readRecentClips,
  writeRecentClips,
  type RecentClip,
} from "@/lib/recent-clips";
import { getLocalStorage } from "./browser";

// One in-memory copy of the list, shared by every component on the page. It still works
// for this visit when localStorage is blocked; it just is not kept.

const EMPTY: RecentClip[] = [];
let cache: RecentClip[] | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function getSnapshot(): RecentClip[] {
  if (cache === null) cache = readRecentClips(getLocalStorage());
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab saved or cleared clips.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== RECENT_CLIPS_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useRecentClips(): RecentClip[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function rememberClip(clip: RecentClip) {
  const next = addRecentClip(getSnapshot(), clip);
  if (next === cache) return;
  cache = next;
  writeRecentClips(getLocalStorage(), next);
  emit();
}

export function forgetAllClips() {
  cache = [];
  clearRecentClips(getLocalStorage());
  emit();
}
