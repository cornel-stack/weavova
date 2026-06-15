"use client";

import { ErrorState } from "@/components/app/error-state";

// Root error boundary (T2.1). A segment's own error.tsx cannot catch a throw in
// its OWN layout, so this parent boundary catches a genuine failure in
// app/app/layout.tsx — the workspace read (getCurrentWorkspace). Because the
// chrome cannot mount without a workspace, it renders the SAME shared ErrorState
// full-page. No global-error.tsx is added (the root layout does no risky read).

export default function RootError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <ErrorState onRetry={reset} />
    </div>
  );
}
