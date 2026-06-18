// Brand-asset view shapes (T4-B2). Derived from the Postgres enum in
// src/db/schema.ts (type-only import — erased at build, no DB/Drizzle code reaches
// any bundle). These are the OWNED, flattened shapes the footage store + the proof
// detail's "Attached brand assets" section consume — OWNED fields only, never a
// view/reach/engagement metric, never a customer-proof framing (FR-019). A brand
// asset is the brand's OWN footage (product video / b-roll), supporting context for
// the eventual T8 render — never the headline, never counted as proof (P-II / FR-019).

import type { brandAssetKindEnum } from "@/db/schema";

export type BrandAssetKind = (typeof brandAssetKindEnum)["enumValues"][number];

// The store-list + attach-picker card shape (the asset itself).
export interface BrandAssetView {
  id: string;
  /** owned "product" | "broll" */
  kind: BrandAssetKind;
  /** owner-authored label */
  label: string;
  /** the real R2 object URL (NOT the stubbed sample-clip seam) */
  assetUrl: string;
  /** ISO date the asset was stored */
  createdAt: string;
}

// The proof-detail "Attached brand assets" row shape — the asset PLUS the
// attachment (so the section can detach it). Extends BrandAssetView; additive.
export interface ProofBrandAssetView extends BrandAssetView {
  /** the proof_brand_asset row id — the detach target */
  attachmentId: string;
  /** ISO date the asset was attached to this proof */
  attachedAt: string;
}

// Owned display labels for the kind chip (no fabricated taxonomy beyond the enum).
export const BRAND_ASSET_KIND_LABEL: Record<BrandAssetKind, string> = {
  product: "Product video",
  broll: "B-roll",
};

// ── Upload contract (client-safe) ────────────────────────────────────────────
// Constants + validators + result types shared by the client upload widget and
// the server actions. Kept here (NOT in r2.ts) so importing them never pulls the
// aws4fetch/R2 signing code into a client bundle.

// Picker options for the kind control (value + display label).
export const BRAND_ASSET_KIND_OPTIONS: { value: BrandAssetKind; label: string }[] =
  [
    { value: "product", label: "Product video" },
    { value: "broll", label: "B-roll" },
  ];

export function isBrandAssetKind(value: unknown): value is BrandAssetKind {
  return value === "product" || value === "broll";
}

// Allowed upload types (web-deliverable video) + a single size bound for short
// product clips. Enforced client-side (pre-PUT) AND server-side (presign).
export const ALLOWED_UPLOAD_TYPES = [
  "video/mp4",
  "video/quicktime", // .mov
  "video/webm",
] as const;
export type AllowedUploadType = (typeof ALLOWED_UPLOAD_TYPES)[number];

export function isAllowedUploadType(value: unknown): value is AllowedUploadType {
  return (
    typeof value === "string" &&
    (ALLOWED_UPLOAD_TYPES as readonly string[]).includes(value)
  );
}

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // ~100 MB
export const LABEL_MAX_LENGTH = 80;

// The presign action's result (server signs a short-lived PUT URL, or rejects).
export type PresignResult =
  | { status: "ok"; uploadUrl: string; key: string }
  | { status: "invalid"; reason: string }
  | { status: "error" };

// The record-row action's result (called AFTER the browser PUT succeeds).
export type CreateBrandAssetResult =
  | { status: "created"; asset: BrandAssetView }
  | { status: "invalid"; reason: string }
  | { status: "error" };

// Attach / detach results (proof detail).
export type AttachResult =
  | { status: "attached" }
  | { status: "already_attached" }
  | { status: "error" };

export type DetachResult = { status: "detached" } | { status: "error" };
