"use client";

import { ErrorState } from "@/components/app/error-state";

// Route-segment error boundary (T3.1), reusing the shared T2.1 ErrorState. Catches a
// genuine failure of the Library read (after withDbRetry exhausts) and renders the
// shared error surface INSIDE the persisting AppChrome. Never shows raw error text.
// reset() re-runs the Library segment's read.

export default function LibraryError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState onRetry={reset} />;
}
