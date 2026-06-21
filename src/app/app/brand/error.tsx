"use client";

import { ErrorState } from "@/components/app/error-state";

// Route-segment error boundary (T5-BrandKit), reusing the shared ErrorState. Catches
// a genuine failure of the brand-kit read (after withDbRetry exhausts) and renders the
// shared error surface INSIDE the persisting AppChrome. reset() re-runs the segment.

export default function BrandKitError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState onRetry={reset} />;
}
