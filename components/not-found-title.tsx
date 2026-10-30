"use client";

import { useEffect } from "react";
import { PAGE_NOT_FOUND_DOCUMENT_TITLE, isClipPath } from "@/lib/not-found";

/**
 * The 404 page's static title is the broken clip one. On any other unknown address, set the
 * tab title to match the "This page doesn't exist" message. After hydration, so Next keeps it.
 */
export function NotFoundTitle() {
  useEffect(() => {
    if (!isClipPath(window.location.pathname)) document.title = PAGE_NOT_FOUND_DOCUMENT_TITLE;
  }, []);
  return null;
}
