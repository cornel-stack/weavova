import { Suspense } from "react";
import { BrandKitData } from "@/components/app/brand/brand-kit-data";
import { BrandKitSkeleton } from "@/components/app/brand/brand-kit-skeleton";
import { getCurrentWorkspace } from "@/lib/session";

// The Brand kit surface (T5-BrandKit) — the workspace's owned visual identity (logo,
// colour, fonts). Replaces the T1 placeholder. A PARTIAL honest port of screen 12
// (logo/colour/fonts only). Server Component: resolves the current workspace via the
// unchanged T1 seam, then streams a skeleton while BrandKitData reads the kit.

export const metadata = {
  title: "Brand kit — Weavova",
};

export default async function BrandKitPage() {
  const workspace = await getCurrentWorkspace();

  return (
    <Suspense fallback={<BrandKitSkeleton />}>
      <BrandKitData workspaceId={workspace.id} />
    </Suspense>
  );
}
