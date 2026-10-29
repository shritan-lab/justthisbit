// What the Clip panel shows, as plain data. The DOM code in panel.ts only renders this.
// Validation and link building come from lib/, the same code the create page uses.

import { MAX_NOTE_LENGTH, buildClipUrl, limitNote, noteLength } from "../../lib/clip";
import { DRAFT_MESSAGES, checkClipDraft, problemPlace } from "../../lib/clip-draft";
import { formatClock, parseTimeInput } from "../../lib/time";
import { EXTENSION_SITE_URL } from "./site";

/** End = start + this when the panel opens (the create page uses the same default). */
export const DEFAULT_LENGTH_SECONDS = 30;

export const LENGTH_CHIPS = [
  { seconds: 15, label: "+15s" },
  { seconds: 30, label: "+30s" },
  { seconds: 60, label: "+1m" },
  { seconds: 120, label: "+2m" },
] as const;

export type PanelState = {
  startText: string;
  endText: string;
  note: string;
  /** While set, the end follows the start at this length. Editing the end by hand clears it. */
  followLength: number | null;
};

export type PanelView = {
  /** The full clip link, or null while the fields have a problem. */
  url: string | null;
  /** "0:30 clip" or "No clip yet". */
  lengthText: string;
  /** "1:30 to 2:00" when the clip is valid. */
  rangeText: string | null;
  startError: string | null;
  endError: string | null;
  rangeError: string | null;
  noteError: string | null;
  noteCount: number;
  noteMax: number;
  /** Seconds of the length chip that matches the current clip, if any. */
  activeChip: number | null;
};

/** A player time as whole seconds. Bad values (NaN, negative) become 0. */
function wholeSeconds(time: number | null | undefined, round: "down" | "up"): number {
  if (typeof time !== "number" || !Number.isFinite(time) || time <= 0) return 0;
  return round === "down" ? Math.floor(time) : Math.ceil(time);
}

/** The panel as it opens: start at the current video time, end 30 seconds later. */
export function openState(now: number | null): PanelState {
  const start = wholeSeconds(now, "down");
  return {
    startText: formatClock(start),
    endText: formatClock(start + DEFAULT_LENGTH_SECONDS),
    note: "",
    followLength: DEFAULT_LENGTH_SECONDS,
  };
}

export function withStartText(state: PanelState, startText: string): PanelState {
  const start = parseTimeInput(startText);
  const endText =
    state.followLength !== null && start !== null ? formatClock(start + state.followLength) : state.endText;
  return { ...state, startText, endText };
}

export function withEndText(state: PanelState, endText: string): PanelState {
  return { ...state, endText, followLength: null };
}

/** "Set to now" for the start. Rounds down so the moment picked is inside the clip. */
export function withStartNow(state: PanelState, now: number): PanelState {
  return withStartText(state, formatClock(wholeSeconds(now, "down")));
}

/** "Set to now" for the end. Rounds up so the moment picked is inside the clip. */
export function withEndNow(state: PanelState, now: number): PanelState {
  return withEndText(state, formatClock(wholeSeconds(now, "up")));
}

/** A length chip: end = start + seconds, and the end keeps following the start. */
export function withLength(state: PanelState, seconds: number): PanelState {
  const start = parseTimeInput(state.startText);
  if (start === null) return state;
  return { ...state, followLength: seconds, endText: formatClock(start + seconds) };
}

export function withNote(state: PanelState, note: string): PanelState {
  return { ...state, note: limitNote(note) };
}

/** Rewrites times the person typed ("90", "1m30s") as clock times once they leave the field. */
export function tidyTimes(state: PanelState): PanelState {
  const start = parseTimeInput(state.startText);
  const end = parseTimeInput(state.endText);
  return {
    ...state,
    startText: start === null ? state.startText : formatClock(start),
    endText: end === null ? state.endText : formatClock(end),
  };
}

export function viewOf(state: PanelState, videoId: string): PanelView {
  const draft = checkClipDraft({ videoId, startText: state.startText, endText: state.endText, note: state.note });
  const noteCount = noteLength(state.note);
  const base = { noteCount, noteMax: MAX_NOTE_LENGTH };

  if (draft.ok) {
    const chip = LENGTH_CHIPS.find((c) => c.seconds === draft.length);
    return {
      ...base,
      url: buildClipUrl(draft.clip, EXTENSION_SITE_URL),
      lengthText: `${formatClock(draft.length)} clip`,
      rangeText: `${formatClock(draft.clip.start)} to ${formatClock(draft.clip.end)}`,
      startError: null,
      endError: null,
      rangeError: null,
      noteError: null,
      activeChip: chip ? chip.seconds : null,
    };
  }

  const message = DRAFT_MESSAGES[draft.problem];
  const place = problemPlace(draft.problem);
  return {
    ...base,
    url: null,
    lengthText: "No clip yet",
    rangeText: null,
    startError: place === "start" ? message : null,
    endError: place === "end" ? message : null,
    rangeError: place === "range" ? message : null,
    noteError: place === "note" ? message : null,
    activeChip: null,
  };
}
