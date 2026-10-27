export const SITE_NAME = "Just This Bit";
export const SITE_TAGLINE = "Share just the part that matters.";

const LOCAL_URL = "http://localhost:3000";

/**
 * The public origin of the site, with no trailing slash.
 * Vercel sets VERCEL_PROJECT_PRODUCTION_URL to a bare host like "justthisbit.vercel.app".
 */
export function getSiteUrl(env: Record<string, string | undefined> = process.env): string {
  const host = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (!host) return LOCAL_URL;
  const withScheme = /^https?:\/\//i.test(host) ? host : `https://${host}`;
  return withScheme.replace(/\/+$/, "");
}

export const SITE_URL = getSiteUrl();
