import { getBrandAssets } from "@/db/queries";
import { FootageStore } from "./footage-store";

// The footage-store data integrator (async Server, T4-B2). One workspace-scoped
// read (getBrandAssets is withDbRetry-wrapped; a transient cold start is retried
// transparently behind the skeleton, a genuine failure throws to error.tsx). Brand
// assets sit OUTSIDE the consent model, so there is no withdrawal filter here — but
// they are owned footage and never proof (FR-019). An empty result renders the
// store with its empty state (the upload widget is always present).

export async function FootageData({ workspaceId }: { workspaceId: string }) {
  const assets = await getBrandAssets(workspaceId);
  return <FootageStore assets={assets} />;
}
