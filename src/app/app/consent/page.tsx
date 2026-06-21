import { Suspense } from "react";
import { ConsentData } from "@/components/app/consent/consent-data";
import { ConsentSkeleton } from "@/components/app/consent/consent-skeleton";
import { getCurrentWorkspace } from "@/lib/session";

// The Consent surface (T5-Consent) — the live control for the consent backbone that
// has gated every surface all session. Replaces the T1 placeholder. Server Component:
// resolves the current workspace via the unchanged T1 seam, then streams a skeleton
// while ConsentData performs the one workspace-scoped ledger read. Inherits the /app
// segment's force-dynamic + AppChrome from the layout.

export const metadata = {
  title: "Consent — Weavova",
};

export default async function ConsentPage() {
  const workspace = await getCurrentWorkspace();

  return (
    <Suspense fallback={<ConsentSkeleton />}>
      <ConsentData workspaceId={workspace.id} />
    </Suspense>
  );
}
