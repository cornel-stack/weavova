"use client";

import { ErrorState } from "@/components/app/error-state";

// Route-segment error boundary (T5-Consent), reusing the shared ErrorState. Catches a
// genuine failure of the consent ledger read (after withDbRetry exhausts) and renders
// the shared error surface INSIDE the persisting AppChrome. Never shows raw error
// text. reset() re-runs the consent segment's read.

export default function ConsentError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState onRetry={reset} />;
}
