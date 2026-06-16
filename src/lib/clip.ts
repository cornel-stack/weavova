// Clip view shapes (T2.4a). Derived from the Postgres enums in src/db/schema.ts
// (type-only import — erased at build). ClipView is the owned, flattened shape the
// proof detail's "Generated assets" section consumes — owned fields only, never a
// view/reach/engagement metric (FR-019).

import type { clipFormatEnum, derivedAssetKindEnum } from "@/db/schema";

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
