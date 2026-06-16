import { Suspense } from "react";
import { ProofDetailData } from "@/components/app/proof-detail/proof-detail-data";
import { ProofDetailSkeleton } from "@/components/app/proof-detail/proof-detail-skeleton";
import { getCurrentWorkspace } from "@/lib/session";

// The Proof detail — the third surface of the spine (T2.3), ported from
// /design-reference screen 03. Server Component: reads the route id and resolves
// the current workspace via the unchanged T1 seam, then streams a skeleton while
// the async ProofDetailData performs the one workspace-scoped read. Inherits the
// /app segment's force-dynamic from the layout.

export const metadata = {
  title: "Proof — Weavova",
};

export default async function ProofDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await getCurrentWorkspace();

  return (
    <Suspense fallback={<ProofDetailSkeleton />}>
      <ProofDetailData workspaceId={workspace.id} id={id} />
    </Suspense>
  );
}
