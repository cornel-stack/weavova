import { Suspense } from "react";
import { FootageData } from "@/components/app/brand-assets/footage-data";
import { FootageSkeleton } from "@/components/app/brand-assets/footage-skeleton";
import { getCurrentWorkspace } from "@/lib/session";

// The Brand-footage store (T4-B2) — the reusable store of the brand's OWN clips
// (product video / b-roll), uploaded to R2 and attachable to proof as supporting
// context. A DERIVED surface: there is no /design-reference screen for a footage
// store, so it ports the Library route-shell pattern (T3.2 precedent) — Server
// Component resolving the workspace via the unchanged T1 seam, streaming a skeleton
// while FootageData performs the one workspace-scoped read. DISTINCT from /app/brand
// (T5 Brand kits = identity: logo/colours/fonts). Inherits /app force-dynamic +
// AppChrome from the layout. Reached via ⌘K and the proof-detail attach picker —
// the nav rail is unchanged.

export const metadata = {
  title: "Brand footage — Weavova",
};

export default async function FootagePage() {
  const workspace = await getCurrentWorkspace();

  return (
    <Suspense fallback={<FootageSkeleton />}>
      <FootageData workspaceId={workspace.id} />
    </Suspense>
  );
}
