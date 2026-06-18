import { notFound } from "next/navigation";
import { getClip } from "@/db/queries";
import { ClipDetail } from "./clip-detail";

// The clip-detail data integrator (async Server, T3.2). One workspace-scoped read
// (getClip is withDbRetry-wrapped; a transient cold start is retried transparently
// behind the skeleton, a genuine failure throws to error.tsx).
//
// THREE-INTO-ONE notFound() (no oracle): getClip returns null for a missing id, a
// cross-workspace id, AND a withdrawn clip (source proof's consent not granted) — all
// funnel here to ONE content-free not-found, with no other tenant's row or withheld
// clip ever projected and no hint which case occurred (T2.3 pattern + P-VII).

export async function ClipDetailData({
  workspaceId,
  id,
}: {
  workspaceId: string;
  id: string;
}) {
  const clip = await getClip(workspaceId, id);

  if (!clip) {
    notFound();
  }

  return <ClipDetail clip={clip} />;
}
