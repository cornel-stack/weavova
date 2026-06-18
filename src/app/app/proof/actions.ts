"use server";

import { revalidatePath } from "next/cache";
import { getGrantedConsentId, insertDerivedAsset } from "@/db/queries";
import { SAMPLE_CLIP_URL } from "@/lib/clip";
import { getCurrentWorkspace } from "@/lib/session";
import {
  validateGenerateInput,
  type BatchItemResult,
  type BatchResult,
  type GenerateBatchInput,
} from "@/lib/studio";

// Batch generate — the bulk form of the T2.4b studio's Generate (T4-B1). It does
// NOT fork the generate logic and does NOT modify generateClip or src/db/queries.ts:
// per proof it reuses the SAME primitives — validateGenerateInput (the guard),
// getGrantedConsentId (the P-VII consent re-check), insertDerivedAsset (the
// single-attempt write, D4), and SAMPLE_CLIP_URL (the honest stub).
//
// P-VII is enforced INSIDE the loop, per proof, at generate — getGrantedConsentId
// re-reads the CURRENT effective consent (never the cached selection view), so a
// proof granted at select but revoked before generate is skipped. No-rollback: each
// insert is independent; a skip/failure never undoes the made clips. The result is
// an honest per-proof tally (made / skipped+reason / failed) — no all-or-nothing,
// no fabricated success (FR-019). One revalidate at the end lights the new clips up
// on the Library / dashboard / showcase via the EXISTING reads.
export async function generateBatch(
  input: GenerateBatchInput,
): Promise<BatchResult> {
  // Identity resolved server-side, never trusted from the client.
  const workspace = await getCurrentWorkspace();

  const items: BatchItemResult[] = [];
  const madeProofIds: string[] = [];

  for (const rawProofId of input.proofIds) {
    // D8 guard reused per proof (format ∈ ClipFormat; batch carries no hook → null).
    const valid = validateGenerateInput({
      proofId: rawProofId,
      format: input.format,
      hook: "",
    });
    if (!valid) {
      items.push({ proofId: rawProofId, status: "error" });
      continue;
    }

    // P-VII: re-check CURRENT effective consent at generate (not cached from select).
    const granted = await getGrantedConsentId(workspace.id, valid.proofId);
    if (!granted) {
      items.push({
        proofId: valid.proofId,
        status: "skipped",
        reason: "needs_consent",
      });
      continue;
    }

    // Single-attempt insert (D4 — not retry-wrapped; independent per proof).
    try {
      await insertDerivedAsset({
        workspaceId: workspace.id,
        proofId: valid.proofId,
        consentId: granted.consentId,
        format: valid.format,
        hook: null,
      });
      items.push({ proofId: valid.proofId, status: "made" });
      madeProofIds.push(valid.proofId);
    } catch {
      items.push({ proofId: valid.proofId, status: "error" });
    }
  }

  // Revalidate ONCE so the existing reads surface the new clips (no read change).
  if (madeProofIds.length > 0) {
    revalidatePath("/app/library");
    revalidatePath("/app");
    revalidatePath("/app/showcase");
    for (const proofId of madeProofIds) {
      revalidatePath(`/app/proof/${proofId}`);
    }
  }

  return {
    made: items.filter((i) => i.status === "made").length,
    skipped: items.filter((i) => i.status === "skipped").length,
    failed: items.filter((i) => i.status === "error").length,
    items,
  };
}
