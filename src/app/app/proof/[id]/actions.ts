"use server";

import { revalidatePath } from "next/cache";
import { attachBrandAsset, detachBrandAsset } from "@/db/queries";
import type { AttachResult, DetachResult } from "@/lib/brand-asset";
import { getCurrentWorkspace } from "@/lib/session";

// Proof-detail brand-asset attach/detach (T4-B2). Attaching/detaching OWNED brand
// footage NEVER touches the consent gate (P-VII): there is no getGrantedConsentId
// call here, no consent prompt, no consent row. A proof's effective consent remains
// the SOLE gate on clip GENERATION (in generateClip/generateBatch, unchanged) — a
// withdrawn proof still cannot make a clip, asset attached or not. Identity is
// resolved server-side via getCurrentWorkspace() (no cross-tenant write).
//
// Detach removes the join row only (the asset + other proofs' attachments survive).
// Delete-from-store is a CONSCIOUS DEFERRAL (Q2:A) — no action removes a brand asset
// or its R2 object in B2.

export async function attachBrandAssetToProof(input: {
  proofId: string;
  brandAssetId: string;
}): Promise<AttachResult> {
  if (
    typeof input.proofId !== "string" ||
    input.proofId.length === 0 ||
    typeof input.brandAssetId !== "string" ||
    input.brandAssetId.length === 0
  ) {
    return { status: "error" };
  }

  const workspace = await getCurrentWorkspace();
  try {
    const res = await attachBrandAsset({
      workspaceId: workspace.id,
      proofId: input.proofId,
      brandAssetId: input.brandAssetId,
    });
    revalidatePath(`/app/proof/${input.proofId}`);
    return res;
  } catch {
    return { status: "error" };
  }
}

export async function detachBrandAssetFromProof(input: {
  proofId: string;
  brandAssetId: string;
}): Promise<DetachResult> {
  if (
    typeof input.proofId !== "string" ||
    input.proofId.length === 0 ||
    typeof input.brandAssetId !== "string" ||
    input.brandAssetId.length === 0
  ) {
    return { status: "error" };
  }

  const workspace = await getCurrentWorkspace();
  try {
    await detachBrandAsset({
      workspaceId: workspace.id,
      proofId: input.proofId,
      brandAssetId: input.brandAssetId,
    });
    revalidatePath(`/app/proof/${input.proofId}`);
    return { status: "detached" };
  } catch {
    return { status: "error" };
  }
}
