import { formatClock } from "./time";

/** `https://wa.me/?text=...` with the note on its own line above the link (SPEC 5.2). */
export function whatsappShareUrl(url: string, note?: string): string {
  const text = note?.trim() ? `${note.trim()}\n${url}` : url;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Title for navigator.share, matching the clip page title: "▶ 0:30 clip · {video title}". */
export function shareTitle(lengthSeconds: number, videoTitle?: string): string {
  const title = videoTitle?.trim();
  return `▶ ${formatClock(lengthSeconds)} clip${title ? ` · ${title}` : ""}`;
}
