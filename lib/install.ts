export type Device = "android" | "iphone" | "desktop";

/**
 * Which /install section to open first (SPEC 5.4).
 * iPadOS reports a Mac user agent, so a "Macintosh" with a touch screen counts as an iPhone or iPad.
 */
export function detectDevice(userAgent: string, maxTouchPoints = 0): Device {
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iphone";
  if (/macintosh/i.test(userAgent) && maxTouchPoints > 1) return "iphone";
  return "desktop";
}

/** The text before the "URL Encoded Text" variable in the iPhone Shortcut's Text action (SPEC 6.2). */
export function shortcutUrlPrefix(siteUrl: string): string {
  return `${siteUrl.replace(/\/+$/, "")}/?url=`;
}

/**
 * PLACEHOLDER: the iCloud link to the finished "Clip it" Shortcut.
 * Build the Shortcut on an iPhone, share it, choose "Copy iCloud Link", and paste it here.
 * While this is null, /install shows "coming soon" in its place.
 */
export const IPHONE_SHORTCUT_ICLOUD_URL: string | null = null;
