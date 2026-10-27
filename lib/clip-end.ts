// The end-of-clip rule from SPEC 5.1, kept pure so it can be unit tested.

/** How often the player checks the playback time while playing. */
export const POLL_INTERVAL_MS = 200;

/** Show the fallback card if the player has not reported ready by then. */
export const READY_TIMEOUT_MS = 10_000;

/**
 * How far media time may run ahead of the wall clock before the jump counts as a seek.
 * Covers poll jitter and the small catch-up after buffering.
 */
export const SEEK_SLACK_SECONDS = 1.5;

/** YouTube starts at the nearest keyframe, which can land a little before `start`. */
export const START_TOLERANCE_SECONDS = 1;

export type PlaybackSample = {
  /** Seconds into the video, from `getCurrentTime()`. */
  mediaTime: number;
  /** `performance.now()` when the sample was taken. */
  wallTimeMs: number;
};

export type CrossingInput = {
  previous: PlaybackSample;
  current: PlaybackSample;
  start: number;
  end: number;
  playbackRate?: number;
};

/** True when the previous sample sits inside the clip (allowing for keyframe slop before `start`). */
export function isInsideClip(mediaTime: number, start: number, end: number): boolean {
  return mediaTime >= start - START_TOLERANCE_SECONDS && mediaTime < end;
}

/**
 * True when playback moved from inside the clip to at or past `end` by playing normally.
 *
 * A jump bigger than the elapsed wall time (times the playback rate) plus some slack is a
 * deliberate seek, and we never fight a seek. Using wall time instead of a fixed step keeps
 * this right when a background tab throttles the poll to once a second or slower.
 */
export function crossedClipEnd({ previous, current, start, end, playbackRate = 1 }: CrossingInput): boolean {
  if (!isInsideClip(previous.mediaTime, start, end)) return false;
  if (current.mediaTime < end) return false;

  const rate = Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1;
  const elapsedSeconds = Math.max(0, (current.wallTimeMs - previous.wallTimeMs) / 1000);
  const advanced = current.mediaTime - previous.mediaTime;
  return advanced <= elapsedSeconds * rate + SEEK_SLACK_SECONDS;
}
