# Contract — The warmth function (`src/lib/warmth.ts`)

Client-safe, pure module (type-only `ProofView` import; no DB code). Owned facts only — **no**
view/reach/engagement/conversion/popularity input (FR-019). Produces an **order**, never a displayed
number (Q2:A).

## Inputs (all owned, already on `ProofView` except `tapped`)

- `consentState: 'granted' | 'awaiting' | 'revoked'` — effective state (shared `effectiveConsentState`).
- `quote: string | null`, `transcript: string | null` — the customer's words (completeness).
- `thumbnail: string | null` — media presence (completeness).
- `capturedAt: string` (ISO) — recency.
- `tapped: boolean` — derived from `tappedIds.has(proof.id)` (un-tapped signal; the additive read).

## Functions

```text
readinessPoints(p: ProofView, tapped: boolean): number
  return (p.quote || p.transcript ? 2 : 0)   // words are worth more than a thumbnail
       + (p.thumbnail ? 1 : 0)
       + (tapped ? 0 : 2)                      // un-tapped is a strong opportunity

warmthCompare(a: ProofView, b: ProofView, tappedIds: ReadonlySet<string>): number
  // descending lexicographic, deterministic:
  // 1) granted first:   (b.consentState==='granted') - (a.consentState==='granted')
  // 2) readiness desc:  only meaningful for granted; non-granted share readiness 0 → fall to recency
  // 3) recency desc:    b.capturedAt.localeCompare(a.capturedAt)
  // 4) id asc:          a.id.localeCompare(b.id)   // final total-order tiebreak (FR-007)

sortByWarmth(proofs: ProofView[], tappedIds: ReadonlySet<string>): ProofView[]
  return [...proofs].sort((a, b) => warmthCompare(a, b, tappedIds))
```

Notes:
- Step 2 computes `readinessPoints` for granted proofs; non-granted are already ordered below all
  granted by step 1, then amongst themselves by recency (step 3) — readiness is not applied to them
  (they're cold regardless). Implementation may short-circuit: if neither is granted, skip to recency.
- ISO strings compare chronologically with `localeCompare`, matching the inbox's existing Newest sort.

## Ordering properties (the binding contract — weights are tunable, these are not)

1. **Consent gate**: every **granted** proof ranks above every **non-granted** proof (P-VII / FR-004).
2. **Content-readiness**: among granted, higher `completeness + un-tapped` ranks higher — a proof with
   the customer's words and no clip yet ranks above a sparse or already-clipped one.
3. **Recency**: ties in readiness (and the whole non-granted group) break by newer `capturedAt`.
4. **Determinism**: `id` is the final tiebreak — equal inputs always yield the same order (FR-007).
5. **No filtering**: `sortByWarmth` returns the **same set** it was given, re-ordered — never drops a
   proof (FR-005).
6. **No number shown**: the function exposes an order; callers MUST NOT render a per-proof score/badge
   (Q2:A).

## Honesty copy (lives on the toolbar control, not per-proof — FR-008)

A single on-token line accompanying the sort control, e.g.:
> "Warmest = most ready to become content — recent, has a full quote or media, not yet clipped. Not a
> view or engagement prediction."

No emoji, no "amazing"/"awesome" (P-XI). The phrase MUST frame warmth as content-readiness, never a
predictive/engagement power.

## Worked example (fixtures intuition)

- A granted video proof with a full quote, thumbnail, **no clip yet**, captured today →
  readiness `2 (words) + 1 (media) + 2 (untapped) = 5` → near the top.
- A granted text proof with a quote, **already clipped**, captured last week →
  readiness `2 + 0 + 0 = 2` → mid.
- A **withdrawn** proof, however fresh/complete → **cold** (below all granted), ordered by recency
  among the cold group — **still visible**.
