import { Suspense } from "react";
import { DashboardBody } from "@/components/app/dashboard/dashboard-body";
import { DashboardSkeleton } from "@/components/app/dashboard/dashboard-skeleton";
import { DashboardTour } from "@/components/app/onboarding/dashboard-tour";
import { getCurrentWorkspace } from "@/lib/session";

// The Dashboard — the home of the app shell (T2.1), ported from
// /design-reference screen 01. Server Component: resolves the current workspace
// via the unchanged T1 session seam, then streams a skeleton while the async
// DashboardBody performs the one workspace-scoped read. Inherits the /app
// segment's force-dynamic from the layout.

export const metadata = {
  title: "Dashboard — Weavova",
};

export default async function DashboardPage() {
  const workspace = await getCurrentWorkspace();

  return (
    <>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardBody workspaceId={workspace.id} />
      </Suspense>
      {/* T6.2 · US5 — the one-shot spotlight tour, shown only when the finish redirect lands
          on /app?tour=1. Suspense-wrapped for useSearchParams; renders nothing otherwise. */}
      <Suspense fallback={null}>
        <DashboardTour />
      </Suspense>
    </>
  );
}
