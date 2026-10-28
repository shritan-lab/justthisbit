export const SITE_NAME = "Just This Bit";
export const SITE_TAGLINE = "Share just the part that matters.";

const LOCAL_URL = "http://localhost:3000";

/**
 * The public origin of the site, with no trailing slash.
 * Vercel sets VERCEL_PROJECT_PRODUCTION_URL to a bare host like "justthisbit.vercel.app".
 * It is the production domain on every build, preview builds included.
 */
export function getSiteUrl(env: Record<string, string | undefined> = process.env): string {
  const host = env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (!host) return LOCAL_URL;
  const withScheme = /^https?:\/\//i.test(host) ? host : `https://${host}`;
  return withScheme.replace(/\/+$/, "");
}

/**
 * The origin used in every link we hand out, on the server and in the browser.
 *
 * next.config.ts runs getSiteUrl() once at build time and inlines the result as
 * NEXT_PUBLIC_SITE_URL, because the browser cannot read VERCEL_PROJECT_PRODUCTION_URL.
 * The fallback only runs outside a Next build (unit tests, scripts).
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || getSiteUrl();
