"use server";

import { getClipExports } from "@/db/queries";
import {
  buildManifest,
  type BulkExportResult,
  type ExportItemResult,
} from "@/lib/export";
import { getCurrentWorkspace } from "@/lib/session";

// Bulk export (T4-B4, Q3:C) — produce ONE JSON manifest of the selected clips'
// owned post-text. It does NOT fork the export logic: it reuses getClipExports (the
// shared-gated read) and buildManifest (the shared contract).
//
// P-VII — the RE-READ at action time: getClipExports re-checks each clip's CURRENT
// effective consent via the shared effectiveConsentGranted predicate (never the
// cached selection), so a clip granted at select but withdrawn before export is
// absent → SKIPPED. This is the B1 generateBatch race applied to a read. The result
// is an HONEST partial (made / skipped) — no all-or-nothing, no fabricated success
// (FR-006 / FR-019). The video is NEVER a finished clip — buildManifest carries only
// the labeled sample reference.
//
// No revalidatePath: export is a READ — nothing changed in the DB.

// Hand-rolled guard (no Zod — none is a dependency; mirrors validateGenerateInput).
// Dedupes and drops empties so the tally counts each requested clip once.
function normaliseClipIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const v of raw) {
    if (typeof v === "string" && v.length > 0) seen.add(v);
  }
  return [...seen];
}

export async function exportClips(input: {
  clipIds: string[];
}): Promise<BulkExportResult> {
  // Identity resolved server-side, never trusted from the client.
  const workspace = await getCurrentWorkspace();

  const clipIds = normaliseClipIds(input?.clipIds);
  const exportedAt = new Date().toISOString();

  if (clipIds.length === 0) {
    return {
      manifest: buildManifest([], exportedAt),
      filename: "weavova-export-0-clips.json",
      made: 0,
      skipped: 0,
      items: [],
    };
  }

  // The consent RE-READ — only currently-granted, in-workspace clips come back.
  const packages = await getClipExports(workspace.id, clipIds);
  const exportedIds = new Set(packages.map((p) => p.clipId));

  const items: ExportItemResult[] = clipIds.map((clipId) => ({
    clipId,
    status: exportedIds.has(clipId) ? "exported" : "skipped",
  }));

  const made = packages.length;
  const skipped = clipIds.length - made;

  return {
    manifest: buildManifest(packages, exportedAt),
    filename: `weavova-export-${made}-clips.json`,
    made,
    skipped,
    items,
  };
}
