"use client";

import { ErrorState } from "@/components/app/error-state";

// Route-segment error boundary (T2.4b), reusing the shared T2.1 ErrorState. Catches a
// genuine failure of the studio's read (after withDbRetry exhausts) and renders the
// shared error surface INSIDE the persisting AppChrome. Never shows raw error text.
// reset() re-runs the studio segment — distinct from notFound() (an expected 404).

export default function ClipStudioError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState onRetry={reset} />;
}
