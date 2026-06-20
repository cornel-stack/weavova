// The post-text export contract (T4-B4). The owned, post-ready payload a proof clip
// leaves the app as — the demo loop's payoff (capture → transform → EXPORT). This
// module is CLIENT-SAFE: ProofType/ClipFormat are type-only imports (erased at
// build, like src/lib/clip.ts / src/lib/studio.ts), and the only value import is the
// plain SAMPLE_CLIP_URL const — no DB/Drizzle code reaches any bundle.
//
// HONESTY (FR-019, FR-003 / Q2:A): the package carries ONLY owned data — the
// brand-authored hook/caption, the customer's VERBATIM proof (the headline — P-II),
// and the proof attribution. NEVER a view/reach/engagement/performance metric. The
// rendered VIDEO is T8 — here it is ONLY an openly-labeled SAMPLE reference
// (SAMPLE_VIDEO_NOTE + the SAMPLE_CLIP_URL pointer), NEVER a finished-clip file.

import { SAMPLE_CLIP_URL } from "@/lib/clip";
import type { ClipFormat } from "@/lib/clip";
import type { ProofType } from "@/lib/proof";

// The owned post-text package for one clip — the real export deliverable. Produced
// at export time from the consent-gated read (getClipExport / getClipExports); NOT a
// stored entity. Owned fields only.
export interface PostTextPackage {
  /** clip identifier */
  clipId: string;
  /** source proof identifier (provenance / link target) */
  proofId: string;
  /** the customer's VERBATIM proof — quote ?? transcript; the headline (P-II). null when a proof carries neither (e.g. some photos) — never fabricated. */
  headline: string | null;
  /** brand-authored caption line (clearly the brand's words), when set */
  hook: string | null;
  /** attribution — the named customer */
  customerName: string;
  /** the "verified real customer" mark (owned) */
  verified: boolean;
  /** capture source label (attribution / provenance), e.g. Shopify, Instagram */
  source: string;
  /** context */
  proofType: ProofType;
  /** context */
  format: ClipFormat;
  /** ISO date the clip was created */
  createdAt: string;
  /** the honest T8 video seam — an openly-labeled SAMPLE reference, NEVER a finished clip (Q2:A) */
  sampleVideo: {
    status: "arrives_at_T8";
    note: string;
    /** the labeled sample pointer (SAMPLE_CLIP_URL) — a sample, never a finished-clip URL */
    reference: string;
  };
}

// The one openly-labeled note that rides with every export so a consumer can NEVER
// mistake the sample for the finished customer clip (FR-003). On-token microcopy —
// no "amazing"/"awesome", no emoji (P-XI).
export const SAMPLE_VIDEO_NOTE =
  "sample — your rendered clip replaces this when rendering ships (T8). Not a finished clip of the customer.";

// Build the labeled sample seam from the shared stub pointer. Centralised so the
// honesty label and the SAMPLE_CLIP_URL pointer always travel together.
export function sampleVideoRef(): PostTextPackage["sampleVideo"] {
  return {
    status: "arrives_at_T8",
    note: SAMPLE_VIDEO_NOTE,
    reference: SAMPLE_CLIP_URL,
  };
}

// Assemble the post-ready text for ONE clip — the single-export clipboard payload.
// Pure; on-token; the customer's words lead (P-II); absent blocks are skipped (no
// empty lines, no placeholder); nothing is fabricated. The bracketed sample note is
// ALWAYS present so the sample is never mistaken for the finished clip.
export function formatPostText(pkg: PostTextPackage): string {
  const attribution = `— ${pkg.customerName}${
    pkg.verified ? ", verified customer" : ""
  } · via ${pkg.source}`;

  const blocks: string[] = [];
  if (pkg.headline) blocks.push(pkg.headline);
  if (pkg.hook) blocks.push(pkg.hook);
  blocks.push(attribution);
  blocks.push(`[${pkg.sampleVideo.note}]`);

  return blocks.join("\n\n");
}

// The bulk manifest (T4-B4, Q3:C) — ONE JSON text artifact for a selection of clips.
// Each entry is the structured owned package PLUS its rendered postText, so the file
// is both machine-readable and paste-ready per clip. No metric fields; the video stays
// a labeled sample. exportedAt is stamped server-side by the exportClips action.
export interface ExportManifestEntry extends PostTextPackage {
  postText: string;
}

export interface ExportManifest {
  exportedAt: string;
  count: number;
  clips: ExportManifestEntry[];
}

export function buildManifest(
  pkgs: PostTextPackage[],
  exportedAt: string,
): string {
  const manifest: ExportManifest = {
    exportedAt,
    count: pkgs.length,
    clips: pkgs.map((pkg) => ({ ...pkg, postText: formatPostText(pkg) })),
  };
  return JSON.stringify(manifest, null, 2);
}

// The exportClips Server Action result — an honest partial (FR-006), mirroring the
// B1 BatchResult shape. made + skipped === the (deduped) requested count; a clip
// whose consent was withdrawn after select is absent from the read → skipped.
export interface ExportItemResult {
  clipId: string;
  status: "exported" | "skipped";
}

export interface BulkExportResult {
  /** the ONE JSON manifest string the client downloads (empty manifest if nothing exported) */
  manifest: string;
  /** suggested download filename, e.g. weavova-export-3-clips.json */
  filename: string;
  /** clips genuinely exported (consent-granted at action time) */
  made: number;
  /** clips skipped — withdrawn / missing / cross-workspace (no oracle) */
  skipped: number;
  /** honest per-clip outcome */
  items: ExportItemResult[];
}
