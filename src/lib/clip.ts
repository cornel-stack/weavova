// Clip view shapes (T2.4a). Derived from the Postgres enums in src/db/schema.ts
// (type-only import — erased at build). ClipView is the owned, flattened shape the
// proof detail's "Generated assets" section consumes — owned fields only, never a
// view/reach/engagement metric (FR-019).

import type { clipFormatEnum, derivedAssetKindEnum } from "@/db/schema";
import type { ConsentState, ProofType } from "@/lib/proof";

export type DerivedAssetKind = (typeof derivedAssetKindEnum)["enumValues"][number];

export type ClipFormat = (typeof clipFormatEnum)["enumValues"][number];

export interface ClipView {
  id: string;
  kind: DerivedAssetKind;
  format: ClipFormat;
  /** stored (stubbed) sample-clip reference */
  assetUrl: string;
  /** brand-authored hook the clip was configured with (owned provenance) */
  hook: string | null;
  /** ISO date the clip was created */
  createdAt: string;
}

// The Library card shape (T3.1). A NEW projection — the owned `ClipView` fields PLUS
// the source-proof context the Library needs (the source customer, the proof-link
// target, and the verified mark). `ClipView` stays byte-unchanged (the proof detail
// still reads it); this is additive. Owned fields only — never a view/reach/
// engagement/performance metric (FR-019).
export interface LibraryClipView extends ClipView {
  /** source proof id — the card's link target (/app/proof/[proofId]) */
  proofId: string;
  /** source customer (the headline — P-II) */
  customerName: string;
  /** the "verified real customer" mark (owned) */
  verified: boolean;
}

// The clip-detail shape (T3.2). A NEW projection — the owned clip metadata + the
// source-proof provenance + TWO consent roles: the MADE-UNDER consent (provenance —
// the version the clip was generated under, via derived_asset.consentId) and the
// proof's CURRENT effective consent (the visibility gate — always 'granted' when the
// clip is viewable). `ClipView`/`LibraryClipView` stay byte-unchanged; this is
// additive. Owned fields only — never a view/reach/engagement/performance metric
// (FR-019).
export interface ClipDetailView {
  id: string;
  kind: DerivedAssetKind;
  format: ClipFormat;
  /** brand-authored hook (owned provenance), shown when set */
  hook: string | null;
  /** stored (stubbed) sample-clip reference — the non-playing "Sample preview" still */
  assetUrl: string;
  /** ISO date the clip was created */
  createdAt: string;
  // source-proof provenance
  /** source proof id — the in-detail source-proof link + re-make studio target */
  proofId: string;
  customerName: string;
  proofType: ProofType;
  verified: boolean;
  /** capture source label */
  source: string;
  // consent — provenance (made-under) vs the current effective gate
  /** the consent version the clip was MADE UNDER (provenance) */
  madeUnderVersion: number;
  /** ISO date of that made-under consent (its grantedAt); null if absent */
  madeUnderAt: string | null;
  /** the proof's CURRENT effective consent state (the gate; granted when viewable) */
  consentState: ConsentState;
  /** current effective consent version; null if no consent row */
  consentVersion: number | null;
  /** ISO current effective consent date; null when none applies */
  consentAt: string | null;
}

// The stubbed render's pre-made sample clip in R2 (CLAUDE.md §3). Extracted here
// (T2.4b — D5) as the ONE source of truth shared by the seed (src/db/seed.ts) and
// the Generate Server Action, so both point the stub at the same asset and the real
// T8 engine swaps behind one seam. Its value MUST equal the seed's original literal
// exactly so a re-seed is behaviour-identical. Never presented as a real per-proof
// render (FR-019).
export const SAMPLE_CLIP_URL = "r2://weavova-samples/press-run-sample.mp4";
