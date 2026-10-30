"use client";

import { useEffect } from "react";
import { StatusPage, primaryAction, secondaryAction } from "./status-page";

export const ERROR_TITLE = "Something broke.";

/**
 * Shown by app/error.tsx and app/global-error.tsx. Reload is a full page load, and the create
 * link is a plain <a>, so both still work when the client router is the thing that broke.
 */
export function ErrorView({ error }: { error: unknown }) {
  useEffect(() => {
    // Lands in the browser console. Server errors are in the Vercel runtime logs under error.digest.
    console.error(error);
  }, [error]);

  return (
    <StatusPage
      testId="error-view"
      title={ERROR_TITLE}
      actions={
        <>
          <button type="button" onClick={() => window.location.reload()} className={primaryAction}>
            Reload
          </button>
          {/* A full page load on purpose: the client router may be what broke. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className={secondaryAction}>
            Make a clip
          </a>
        </>
      }
    >
      Reload the page to try again. If it keeps happening, start over and make a new clip.
    </StatusPage>
  );
}
