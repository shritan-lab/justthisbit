"use client";

import { Analytics } from "@vercel/analytics/next";
import { scrubAnalyticsEvent } from "@/lib/analytics";

/** Vercel Web Analytics, the only tracker (SPEC 7). Notes and pasted text never leave the page. */
export function VercelAnalytics() {
  return <Analytics beforeSend={scrubAnalyticsEvent} />;
}
