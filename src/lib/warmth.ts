// Warmth = CONTENT-READINESS (T4-B3). A transparent, read-time ordering of the proof
// inbox by how ready and worth-it a proof is to become content — computed ONLY from
// owned facts. This module is CLIENT-SAFE and PURE: ProofView is a type-only import
// (erased at build, the clip.ts/studio.ts/export.ts idiom), no DB code reaches any
// bundle.
//
// HONESTY (FR-019): warmth is NOT an engagement / conversion / view / popularity
// prediction — the product holds none of that data. It is a NARRATABLE function of
// owned facts: consent, the customer's words / media, whether a clip was already
// made, and recency. It is a LEXICOGRAPHIC ORDER, never a weighted-sum "score", and
// NO number is ever displayed (Q2:A) — warmth is purely the resulting order.

import type { ProofView } from "@/lib/proof";

// Readiness points for a GRANTED proof, from owned facts only. Words count for more
// than a thumbnail (richer content); an un-tapped proof is a strong opportunity.
// Non-granted proof never uses these — the consent gate ranks it cold regardless.
export function readinessPoints(p: ProofView, tapped: boolean): number {
  return (
    (p.quote || p.transcript ? 2 : 0) + // the customer's words
    (p.thumbnail ? 1 : 0) + // media
    (tapped ? 0 : 2) // un-tapped opportunity
  );
}

// The warmth comparator — descending lexicographic, fully deterministic (FR-007):
//   (1) consent GATE: granted ranks above non-granted (withdrawn OR awaiting — both
//       cold; matches the generation gate — only granted can become content, P-VII),
//   (2) readiness points (granted only; non-granted share readiness 0 → fall through),
//   (3) recency: capturedAt desc (the same timestamp the inbox's "Newest" uses),
//   (4) id asc: the final total-order tiebreak (no random ordering).
// tappedIds = the proofIds with ≥1 clip (the un-tapped signal — additive read).
export function warmthCompare(
  a: ProofView,
  b: ProofView,
  tappedIds: ReadonlySet<string>,
): number {
  // (1) consent gate
  const aGranted = a.consentState === "granted";
  const bGranted = b.consentState === "granted";
  if (aGranted !== bGranted) return aGranted ? -1 : 1;

  // (2) readiness — only meaningful for granted; cold group shares 0 and falls through
  if (aGranted) {
    const ar = readinessPoints(a, tappedIds.has(a.id));
    const br = readinessPoints(b, tappedIds.has(b.id));
    if (ar !== br) return br - ar;
  }

  // (3) recency — ISO strings compare chronologically (matches the Newest sort)
  const byRecency = b.capturedAt.localeCompare(a.capturedAt);
  if (byRecency !== 0) return byRecency;

  // (4) deterministic final tiebreak
  return a.id.localeCompare(b.id);
}

// Order a proof list by warmth — returns the SAME set re-ordered (never drops a
// proof; warmth orders, it never filters — FR-005). The caller passes the already-
// filtered list so the count is identical to the Newest view (FR-006).
export function sortByWarmth(
  proofs: ProofView[],
  tappedIds: ReadonlySet<string>,
): ProofView[] {
  return [...proofs].sort((a, b) => warmthCompare(a, b, tappedIds));
}
