import { Suspense } from "react";
import { LibraryData } from "@/components/app/library/library-data";
import { LibrarySkeleton } from "@/components/app/library/library-skeleton";
import { getCurrentWorkspace } from "@/lib/session";

// The Library — the home for generated clips (T3.1), ported from /design-reference
// screen 09 (clips-only). Replaces the T1 placeholder. Server Component: resolves
// the current workspace via the unchanged T1 seam, then streams a skeleton while
// LibraryData performs the one workspace-scoped, withdrawal-filtered read. Inherits
// the /app segment's force-dynamic + AppChrome from the layout.

export const metadata = {
  title: "Library — Weavova",
};

export default async function LibraryPage() {
  const workspace = await getCurrentWorkspace();

  return (
    <Suspense fallback={<LibrarySkeleton />}>
      <LibraryData workspaceId={workspace.id} />
    </Suspense>
  );
}
