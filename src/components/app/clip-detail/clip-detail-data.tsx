import { notFound } from "next/navigation";
import { getClip, getClipExport } from "@/db/queries";
import { formatPostText } from "@/lib/export";
import { ClipDetail } from "./clip-detail";
import { ClipExportButton } from "./clip-export-button";

// The clip-detail data integrator (async Server, T3.2 + T4-B4). The existing getClip
// read (T3.2) is byte-unchanged; T4-B4 ADDS one workspace-scoped, consent-gated read
// (getClipExport) and assembles the post-text package's copy text server-side, handed
// to the ClipExportButton island (so the clipboard write is synchronous and
// gesture-safe — research §4). Both reads are withDbRetry-wrapped.
//
// THREE-INTO-ONE notFound() (no oracle): getClip returns null for a missing id, a
// cross-workspace id, AND a withdrawn clip (source proof's consent not granted) — all
// funnel here to ONE content-free not-found, with no other tenant's row or withheld
// clip ever projected and no hint which case occurred (T2.3 pattern + P-VII).
//
// CONSENT (P-VII): the page is already gated by getClip — a withdrawn clip
// notFound()s, so the export island is NEVER rendered for it. getClipExport is the
// SAME-gated companion (the shared effectiveConsentGranted predicate), not a bypass;
// in the withdrawn case it returns null too, and the export slot is simply omitted.

export async function ClipDetailData({
  workspaceId,
  id,
}: {
  workspaceId: string;
  id: string;
}) {
  const [clip, exportPkg] = await Promise.all([
    getClip(workspaceId, id),
    getClipExport(workspaceId, id),
  ]);

  if (!clip) {
    notFound();
  }

  const exportAction = exportPkg ? (
    <ClipExportButton text={formatPostText(exportPkg)} />
  ) : undefined;

  return <ClipDetail clip={clip} exportAction={exportAction} />;
}
