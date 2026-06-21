"use server";

import { revalidatePath } from "next/cache";
import {
  getConsentHistory,
  getProofConsentClips,
  recordConsentWithdrawal,
} from "@/db/queries";
import type { ProofConsentDetail } from "@/lib/consent";
import { getCurrentWorkspace } from "@/lib/session";

// Per-proof consent detail — fetched on row-open (one round-trip): the FULL retained
// version timeline + the made-under provenance. The provenance `clips` also carries
// the cascade-preview N (= clips.length) — the SHARED read (Q1 ∩ Q2). A read: no
// revalidatePath. Workspace resolved server-side (never trusted from the client).
export async function getProofConsentDetail(
  proofId: string,
): Promise<ProofConsentDetail> {
  const workspace = await getCurrentWorkspace();
  const [history, clips] = await Promise.all([
    getConsentHistory(workspace.id, proofId),
    getProofConsentClips(workspace.id, proofId),
  ]);
  return { history, clips };
}

// Record a customer's withdrawal (T5-Consent — the centerpiece). RECORDS the
// customer's wish (not a brand-side revoke); writes a new withdrawn version through
// the existing model (prior versions retained), reusing the shared gate — no new gate.
// On success, ONE revalidatePath cluster lets the FREE CASCADE surface everywhere at
// once (every consuming surface gates on effectiveConsentState at read time — zero
// edits to them). There is NO re-grant action.
export async function recordWithdrawal(
  proofId: string,
): Promise<{ status: "recorded" | "not_granted" | "error"; version?: number }> {
  try {
    const workspace = await getCurrentWorkspace();
    const result = await recordConsentWithdrawal(workspace.id, proofId);

    if (result.status === "recorded") {
      // The free cascade: refresh the consent surface + every surface that reads
      // effective consent, so the recorded withdrawal shows everywhere at once.
      revalidatePath("/app/consent");
      revalidatePath("/app");
      revalidatePath("/app/library");
      revalidatePath("/app/showcase");
      revalidatePath("/app/proof");
      revalidatePath(`/app/proof/${proofId}`);
    }

    return result;
  } catch {
    return { status: "error" };
  }
}
