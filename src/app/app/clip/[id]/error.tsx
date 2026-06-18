"use client";

import { ErrorState } from "@/components/app/error-state";

// Route-segment error boundary (T3.2), reusing the shared T2.1 ErrorState — the ONLY
// "use client" file in this slice. Catches a genuine failure of the clip read (after
// withDbRetry exhausts) and renders the shared error surface INSIDE the persisting
// AppChrome. Never shows raw error text. reset() re-runs the segment — structurally
// distinct from notFound() (the expected no-oracle 404).

export default function ClipDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState onRetry={reset} />;
}
