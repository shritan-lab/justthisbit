"use client";

import { useEffect } from "react";

/** Registers /sw.js in production builds only, so `next dev` never runs a service worker. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    try {
      if (!("serviceWorker" in navigator)) return;
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
        // Not installable without it, but the site works the same.
      });
    } catch {
      // Some privacy modes throw on access. Nothing to do.
    }
  }, []);
  return null;
}
