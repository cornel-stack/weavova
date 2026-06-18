import { Suspense } from "react";
import { ShowcaseData } from "@/components/app/showcase/showcase-data";
import { ShowcaseSkeleton } from "@/components/app/showcase/showcase-skeleton";
import { getCurrentWorkspace } from "@/lib/session";

// The Showcase — the curate/preview wall of proof (T-Showcase), ported from the OWNED
// half of /design-reference screen 10. Replaces the T1 placeholder. Server Component:
// resolves the current workspace via the unchanged T1 seam, then streams a skeleton
// while ShowcaseData performs the one workspace-scoped, withdrawal-filtered read.
// Inherits the /app segment's force-dynamic + AppChrome. Distribution (publish/embed/
// share) is T9 — not rendered here.

export const metadata = {
  title: "Showcase — Weavova",
};

export default async function ShowcasePage() {
  const workspace = await getCurrentWorkspace();

  return (
    <Suspense fallback={<ShowcaseSkeleton />}>
      <ShowcaseData workspaceId={workspace.id} />
    </Suspense>
  );
}
