import { Suspense } from "react";
import { InboxData } from "@/components/app/proof-inbox/inbox-data";
import { InboxSkeleton } from "@/components/app/proof-inbox/inbox-skeleton";
import { getCurrentWorkspace } from "@/lib/session";

// The Proof inbox — the second surface of the spine (T2.2), ported from
// /design-reference screen 02. Server Component: resolves the current workspace
// via the unchanged T1 session seam, then streams a skeleton while the async
// InboxData performs the one workspace-scoped read. Inherits the /app segment's
// force-dynamic from the layout.

export const metadata = {
  title: "Proof — Weavova",
};

export default async function ProofInboxPage() {
  const workspace = await getCurrentWorkspace();

  return (
    <Suspense fallback={<InboxSkeleton />}>
      <InboxData workspaceId={workspace.id} />
    </Suspense>
  );
}
