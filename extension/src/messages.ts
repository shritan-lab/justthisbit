// The one message between the popup and the content script: "which video, and what time is it?"

export const STATE_MESSAGE = "jtb:state";

export type StateReply = { videoId: string | null; time: number | null };

export function isStateRequest(message: unknown): boolean {
  return typeof message === "object" && message !== null && (message as { type?: unknown }).type === STATE_MESSAGE;
}

/** Checks a reply from the tab. Anything malformed counts as no reply. */
export function readStateReply(reply: unknown): StateReply | null {
  if (typeof reply !== "object" || reply === null) return null;
  const { videoId, time } = reply as { videoId?: unknown; time?: unknown };
  return {
    videoId: typeof videoId === "string" ? videoId : null,
    time: typeof time === "number" && Number.isFinite(time) && time >= 0 ? time : null,
  };
}
