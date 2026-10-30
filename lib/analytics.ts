// Vercel Web Analytics (SPEC 7) records the URL of every page view. These query params hold
// text a person typed, so they are removed before anything is sent:
// - `n`: the note on a clip link (/c/{id}/{range}?n=...).
// - `url`: raw shared text the create page could not read (/?url=..., sent by /share).
export const PRIVATE_PARAMS = ["n", "url"] as const;

/** `url` without the private params. Returns null when it cannot be read, so nothing is sent. */
export function stripPrivateParams(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  for (const key of PRIVATE_PARAMS) parsed.searchParams.delete(key);
  return parsed.toString();
}

/** The `beforeSend` hook for @vercel/analytics. Drops the event if its URL cannot be cleaned. */
export function scrubAnalyticsEvent<T extends { url: string }>(event: T): T | null {
  const url = stripPrivateParams(event.url);
  return url === null ? null : { ...event, url };
}
