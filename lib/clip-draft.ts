import { MAX_CLIP_SECONDS, parseClipParams, type Clip } from "./clip";
import { parseTimeInput } from "./time";

/** What the create page's editor checks before it shows a link. */
export type ClipDraft = {
  videoId: string;
  startText: string;
  endText: string;
  note: string;
};

export type DraftProblem = "bad_start" | "bad_end" | "end_before_start" | "too_long" | "note_too_long" | "bad_video";

export type DraftResult =
  | { ok: true; clip: Clip; length: number }
  | { ok: false; problem: DraftProblem; start: number | null; end: number | null };

export const DRAFT_MESSAGES: Record<DraftProblem, string> = {
  bad_start: "Start time not understood. Try 1:30 or 90.",
  bad_end: "End time not understood. Try 2:00 or 120.",
  end_before_start: "The end has to be after the start.",
  too_long: "Clips can be up to 60 minutes long.",
  note_too_long: "Notes can be up to 140 characters.",
  bad_video: "That video can't be used. Paste the link again.",
};

/** Where each problem is shown: next to a time field, under the length readout, or by the note. */
export function problemPlace(problem: DraftProblem): "start" | "end" | "range" | "note" {
  if (problem === "bad_start") return "start";
  if (problem === "bad_end") return "end";
  if (problem === "note_too_long") return "note";
  return "range";
}

/** Checks the editor fields and, when they are fine, returns the clip the link is built from. */
export function checkClipDraft({ videoId, startText, endText, note }: ClipDraft): DraftResult {
  const start = parseTimeInput(startText);
  const end = parseTimeInput(endText);
  const fail = (problem: DraftProblem): DraftResult => ({ ok: false, problem, start, end });

  if (start === null) return fail("bad_start");
  if (end === null) return fail("bad_end");
  if (end <= start) return fail("end_before_start");
  if (end - start > MAX_CLIP_SECONDS) return fail("too_long");

  // The same Zod validation the clip page runs, so a link we hand out always opens.
  const parsed = parseClipParams({ videoId, range: `${start}-${end}`, n: note });
  if (parsed.ok) return { ok: true, clip: parsed.clip, length: parsed.clip.end - parsed.clip.start };
  switch (parsed.reason) {
    case "note_too_long":
      return fail("note_too_long");
    case "bad_id":
      return fail("bad_video");
    case "too_long":
      return fail("too_long");
    case "too_short":
      return fail("end_before_start");
    case "bad_range":
      // Only reachable with absurd times (10+ digits of seconds).
      return fail(start > end ? "end_before_start" : "bad_start");
  }
}
