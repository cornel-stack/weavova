import { Suspense } from "react";
import { ClipDetailData } from "@/components/app/clip-detail/clip-detail-data";
import { ClipDetailSkeleton } from "@/components/app/clip-detail/clip-detail-skeleton";
import { getCurrentWorkspace } from "@/lib/session";

// The Clip detail — a generated clip's focused view (T3.2), a DERIVED surface (no
// design-reference screen) at the durable canonical route /app/clip/[id]. Server
// Component: reads the route id, resolves the current workspace via the unchanged T1
// seam, then streams a skeleton while ClipDetailData performs the one workspace-scoped,
// withdrawal-gated read. Inherits the /app segment's force-dynamic + AppChrome.

export const metadata = {
  title: "Clip — Weavova",
};

export default async function ClipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await getCurrentWorkspace();

  return (
    <Suspense fallback={<ClipDetailSkeleton />}>
      <ClipDetailData workspaceId={workspace.id} id={id} />
    </Suspense>
  );
}
