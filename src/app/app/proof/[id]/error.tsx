"use client";

import { ErrorState } from "@/components/app/error-state";

// Page-segment error boundary (T2.3), reusing the shared T2.1 ErrorState — the ONLY
// "use client" file in this slice. Catches a genuine failure of the detail read
// (after withDbRetry exhausts) and renders the shared error surface INSIDE the
// persisting AppChrome. Never shows raw error text. reset() re-runs the detail
// segment's read — distinct from notFound() (an expected 404, not an error). The
// root app/error.tsx (layout read) and the T2.2 inbox app/app/proof/error.tsx are
// unchanged.

export default function ProofDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState onRetry={reset} />;
}
