"use server";

import { getProofClipStatus } from "@/db/queries";
import { getCurrentWorkspace } from "@/lib/session";

// Opt-in-lazy clip-status for the inbox warmth sort (T4-B3). Lives in its OWN file so
// proof/actions.ts (generateBatch) stays byte-stable. Resolves the workspace
// server-side (identity never trusted from the client; no client input to trust) and
// returns the proofIds with ≥1 clip — the un-tapped warmth signal's input.
//
// This is called ONLY on the first toggle to Warmest (the default Newest inbox path
// never calls it). A read, not a mutation: no revalidatePath. The client caches the
// result, so a later re-toggle does not re-fetch.
export async function getInboxClipStatus(): Promise<string[]> {
  const workspace = await getCurrentWorkspace();
  return getProofClipStatus(workspace.id);
}
