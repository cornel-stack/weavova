// Showcase wall item (T-Showcase). The wall is a mixed list of the workspace's
// consented proof and clips; ShowcaseItem is a discriminated union over the EXISTING
// view shapes — ProofView (a consented testimonial) and LibraryClipView (a consented
// clip, sample/preview pre-T8). Both stay byte-unchanged; this is additive. Owned
// fields only — the verified mark is carried (surfaced, not a gate); no fabricated
// metric (FR-019).

import type { LibraryClipView } from "@/lib/clip";
import type { ProofView } from "@/lib/proof";

export type ShowcaseItem =
  | { kind: "proof"; proof: ProofView }
  | { kind: "clip"; clip: LibraryClipView };
