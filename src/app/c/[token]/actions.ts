"use server";

import { revalidatePath } from "next/cache";
import {
  consumeCaptureToken,
  getWorkspaceDisplayDefault,
  writeCapturedProof,
} from "@/db/queries";
import { resolveDisplay, type NameDisplay } from "@/lib/consent";

// The capture send write-path (T7.2 — US3). TOKEN-SCOPED: identity is resolved from the
// token, never a session (no getCurrentWorkspace on this public route). Increment 1 wires
// the TEXT path; the media (video) path lands in Increment 2 (presignCaptureUpload).
//
// Order (P-VII + atomicity on neon-http, which has no interactive txn):
//   1. consumeCaptureToken — the ATOMIC single-use guard (open + unexpired → used).
//   2. resolveDisplay(serverFloor, customerOverride) — the SOLE sanctioned display write
//      path; the override may only move MORE private than the workspace default (the
//      floor is read SERVER-SIDE, never trusted from the client).
//   3. writeCapturedProof — one db.batch([proof, consent(granted, organic), basis(stub)]).
// A post-consume failure burns the token (no partial proof — the batch is atomic);
// the customer is told to ask for a new link.

export type SubmitCaptureResult =
  | { status: "ok" }
  | { status: "expired" }
  | { status: "used" }
  | { status: "not_found" }
  | { status: "invalid"; reason: string }
  | { status: "error" };

export async function submitCapture(input: {
  token: string;
  path: "text"; // Increment 1 — text only; video is Increment 2; photo/audio are T7.2b
  text?: string;
  displayOverride?: Partial<{ nameDisplay: NameDisplay; showFace: boolean }>;
}): Promise<SubmitCaptureResult> {
  if (input.path !== "text") {
    return { status: "invalid", reason: "That option isn't available yet." };
  }
  const text = (input.text ?? "").trim();
  if (text.length === 0) {
    return { status: "invalid", reason: "Add a few words first." };
  }

  // 1. Atomic single-use consume (a consumed/expired token yields null → honest block).
  const consumed = await consumeCaptureToken(input.token);
  if (!consumed) {
    // The token is no longer open: used, expired, or unknown. Resolve which honestly.
    return { status: "used" };
  }

  try {
    // 2. Resolve display against the SERVER-OWNED floor (more-private-only).
    const floor = await getWorkspaceDisplayDefault(consumed.workspaceId);
    const display = resolveDisplay(floor, input.displayOverride);

    // 3. Write the fixture-shaped proof + real granted (organic) consent + basis stub.
    await writeCapturedProof({
      workspaceId: consumed.workspaceId,
      sourceId: consumed.sourceId,
      requestId: consumed.requestId,
      // the customer's name comes from the request context (owned), not the client
      customerName: consumed.customerName ?? "A customer",
      proofType: "text",
      quote: text, // testimony-verbatim — stored exactly as typed
      transcript: null,
      display,
    });

    // Make the new proof appear in the owner surfaces (existing reads, no edits).
    revalidatePath("/app");
    revalidatePath("/app/proof");
    return { status: "ok" };
  } catch {
    // The token is already consumed (single-use); the batch is atomic so NO partial
    // proof exists. Honest error — the customer asks the brand for a fresh link.
    return { status: "error" };
  }
}
