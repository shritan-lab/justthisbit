"use client";

import { ErrorView } from "@/components/error-view";

// Wraps every page under the root layout: /, /install and /c/{videoId}/{range} (SPEC 7).
// Errors in the root layout itself go to app/global-error.tsx.
export default function Error({ error }: { error: unknown; retry: () => void }) {
  return <ErrorView error={error} />;
}
