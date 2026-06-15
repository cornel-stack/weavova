"use client";

import { ErrorState } from "@/components/app/error-state";

// Page-segment error boundary (T2.1). Catches a genuine failure in the dashboard
// page / its read (after withDbRetry exhausts) and renders the shared ErrorState
// INSIDE the persisting AppChrome (rail + top bar stay). Never shows raw error
// text. reset() re-renders the segment — once the DB is reachable it recovers.

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState onRetry={reset} />;
}
