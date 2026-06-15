"use client";

import { ErrorState } from "@/components/app/error-state";

// Page-segment error boundary (T2.2), reusing the shared T2.1 ErrorState. Catches
// a genuine failure of the inbox read (after withDbRetry exhausts) and renders
// the shared error surface INSIDE the persisting AppChrome (rail + top bar stay).
// Never shows raw error text. reset() re-renders the segment — once the DB is
// reachable it recovers. The layout's workspace read stays covered by the root
// app/error.tsx (T2.1), unchanged.

export default function ProofInboxError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState onRetry={reset} />;
}
