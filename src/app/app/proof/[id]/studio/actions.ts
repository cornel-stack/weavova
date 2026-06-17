"use server";

import { revalidatePath } from "next/cache";
import { getGrantedConsentId, insertDerivedAsset } from "@/db/queries";
import { SAMPLE_CLIP_URL } from "@/lib/clip";
import { getCurrentWorkspace } from "@/lib/session";
import {
  validateGenerateInput,
  type GenerateInput,
  type GenerateResult,
} from "@/lib/studio";

// Generate — the app's FIRST mutation (T2.4b). Stubbed render (CLAUDE.md §3): it does
// NOT render; it persists a derived_asset pointing at the shared sample clip, and the
// client reveals it explicitly labelled a sample/preview (FR-007/Q2).
//
// P-VII is enforced HERE, server-side, on the CURRENT effective consent (never cached
// from page open): getGrantedConsentId reuses the shared effectiveConsentState, so the
// generate gate is IDENTICAL to T2.4a's read-time withdrawal gate. Only a granted proof
// writes; the granted consentId is stored as provenance. The insert is a single attempt
// (D4 — not retried). On success we revalidate the proof detail + dashboard so they
// reflect the new row through T2.4a's UNCHANGED reads.
export async function generateClip(raw: GenerateInput): Promise<GenerateResult> {
  // D8: validate BOTH inputs server-side (format ∈ ClipFormat, hook capped) — never
  // trust the client. Invalid → error, no write.
  const input = validateGenerateInput(raw);
  if (!input) {
    return { status: "error" };
  }

  // Identity is resolved server-side, never from the client (no cross-workspace write).
  const workspace = await getCurrentWorkspace();

  // P-VII consent re-check. null → not granted → block, no write.
  const granted = await getGrantedConsentId(workspace.id, input.proofId);
  if (!granted) {
    return { status: "consent_required" };
  }

  let createdAt: Date;
  try {
    const row = await insertDerivedAsset({
      workspaceId: workspace.id,
      proofId: input.proofId,
      consentId: granted.consentId,
      format: input.format,
      hook: input.hook,
    });
    createdAt = row.createdAt;
  } catch {
    return { status: "error" };
  }

  // Light up the detail "Generated assets" + the dashboard "clips this month" /
  // latest-clip via T2.4a's reads (SC-008).
  revalidatePath(`/app/proof/${input.proofId}`);
  revalidatePath("/app");

  return {
    status: "generated",
    clip: {
      format: input.format,
      hook: input.hook,
      assetUrl: SAMPLE_CLIP_URL,
      createdAt: createdAt.toISOString(),
    },
  };
}
