"use client";

import { ErrorState } from "@/components/app/error-state";

// Route-segment error boundary (T4-B2), reusing the shared T2.1 ErrorState. Catches
// a genuine failure of the footage-store read (after withDbRetry exhausts) and
// renders the shared error surface INSIDE the persisting AppChrome. Never shows raw
// error text. reset() re-runs the segment's read.

export default function FootageError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState onRetry={reset} />;
}
