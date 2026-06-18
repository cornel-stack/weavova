"use client";

import { ErrorState } from "@/components/app/error-state";

// Route-segment error boundary (T-Showcase), reusing the shared T2.1 ErrorState — the
// ONLY "use client" file in this slice. Catches a genuine failure of the Showcase read
// (after withDbRetry exhausts) and renders the shared error surface INSIDE the
// persisting AppChrome. Never shows raw error text. reset() re-runs the segment's read.

export default function ShowcaseError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState onRetry={reset} />;
}
