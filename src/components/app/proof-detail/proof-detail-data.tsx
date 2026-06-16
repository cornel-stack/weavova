import { notFound } from "next/navigation";
import { getProof, getProofClips } from "@/db/queries";
import { ProofDetail } from "./proof-detail";

// The data integrator (async Server, T2.3). Performs the single workspace-scoped
// read inside the page's Suspense boundary (getProof is wrapped in withDbRetry, so
// a transient Neon cold start is retried transparently behind the skeleton; a
// genuine failure throws to [id]/error.tsx).
//
// Tenant isolation (US3): getProof returns null for a missing id AND for an id in
// another workspace — the same result, with no other tenant's row ever projected.
// On null we call Next's notFound(), which routes to the single content-free
// not-found.tsx (identical output for both cases — no existence oracle, no leak),
// structurally distinct from the thrown-failure error boundary.

export async function ProofDetailData({
  workspaceId,
  id,
}: {
  workspaceId: string;
  id: string;
}) {
  const proof = await getProof(workspaceId, id);

  if (!proof) {
    notFound();
  }

  // The proof's generated clips (T2.4a) — a separate workspace-scoped read so the
  // T2.3 getProof / ProofDetailView contract stays byte-stable. Withdrawn clips are
  // excluded by the read (P-VII).
  const clips = await getProofClips(workspaceId, id);

  return <ProofDetail proof={proof} clips={clips} />;
}
