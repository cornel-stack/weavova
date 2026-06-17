import { Suspense } from "react";
import { StudioData } from "@/components/app/clip-studio/studio-data";
import { StudioSkeleton } from "@/components/app/clip-studio/studio-skeleton";
import { getCurrentWorkspace } from "@/lib/session";

// The Clip studio — the spine finale (T2.4b), ported from /design-reference screen
// 04. A real route INSIDE the /app AppChrome (D1): the rail/top-bar/switcher/palette
// persist; the studio renders over the proof content with a close back to it. Server
// Component: reads the route id, resolves the workspace via the unchanged T1 seam,
// then streams a skeleton while StudioData performs the workspace-scoped read.
// Inherits the /app segment's force-dynamic from the layout.

export const metadata = {
  title: "Clip studio — Weavova",
};

export default async function ClipStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspace = await getCurrentWorkspace();

  return (
    <Suspense fallback={<StudioSkeleton />}>
      <StudioData workspaceId={workspace.id} id={id} />
    </Suspense>
  );
}
