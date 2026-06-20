# Phase 1 — Data Model: T4-B3 Warmth sort

## Schema change: NONE (confirmed)

Warmth is **computed at read/render time** — **no new table, column, enum, migration, or stored warmth
value**. A stored warmth column would go stale against recency, clip-status, and consent; the spec
mandates read-time compute. Every input is an existing owned fact:

| Warmth input | Source (existing) | Already on `ProofView`? |
|---|---|---|
| recency | `proof.capturedAt` | **Yes** (`capturedAt`) — the Newest basis |
| completeness (words) | `proof.quote` / `proof.transcript` | **Yes** |
| completeness (media) | `proof.thumbnail` | **Yes** |
| consent (the gate) | effective `consentState` (shared `effectiveConsentState`) | **Yes** |
| un-tapped (clip status) | existence of `derived_asset` rows for the proof | **No** — the one missing input |

## New computed value (not stored): the warmth order

Defined in **new** `src/lib/warmth.ts` (client-safe; **type-only** `ProofView` import — the
`clip.ts`/`studio.ts`/`export.ts` idiom). Pure functions, no DB:

```text
// readiness points for a granted proof (owned facts only)
readinessPoints(p: ProofView, tapped: boolean): number
  = (p.quote || p.transcript ? 2 : 0)   // the customer's words
  + (p.thumbnail ? 1 : 0)               // media
  + (tapped ? 0 : 2)                     // un-tapped opportunity

// total order — lexicographic, descending, with a deterministic final tiebreak
warmthCompare(a, b, tappedIds: ReadonlySet<string>): number
  // 1) consent gate: granted (consentState === 'granted') ranks above non-granted
  // 2) readinessPoints (granted only; non-granted skip to recency)
  // 3) recency: capturedAt desc
  // 4) id asc  (fully deterministic — FR-007)

sortByWarmth(proofs: ProofView[], tappedIds: ReadonlySet<string>): ProofView[]
```

**Properties (the contract — see contracts/warmth-function.md):** granted ≻ non-granted; among granted,
more-complete ≻ sparser and un-tapped ≻ tapped (combined as points); recency breaks ties; the order is
total and deterministic. **No numeric score is exposed** (Q2:A) — warmth is purely the resulting order.

## New read shape (additive): clip status

`getProofClipStatus(workspaceId): Promise<string[]>` — the proofIds in the workspace with **≥1**
`derived_asset` ("tapped"). **Not** consent-filtered (provenance fact). Returned to the client (via the
`getInboxClipStatus` action) as a `Set<string>` for O(1) `tappedIds.has(id)` in `warmthCompare`.

**Relationship to existing shapes** (all **byte-unchanged** — FR-009): `ProofView`, `getProofs`,
`getLibraryClips`, `getProofClips`, `ClipView`/`LibraryClipView`/`ClipDetailView`, the showcase shapes —
untouched. `getProofClipStatus` is a **new sibling** read; it returns a list of ids, not a view.

## Transient UI state (not persisted)

In `inbox-client.tsx` (mirrors today's filter/sort state):
- `sort: "newest" | "warmest"` — extends the current `"newest"`-only `SortKey`; **default `"newest"`**.
- `tappedIds: Set<string> | null` — the opt-in-lazy clip-status cache; **initial `null`**; populated by
  the `getInboxClipStatus` action **only** on the first toggle to Warmest. Never fetched on the default
  path.

## Validation / honesty rules

- **Owned-only (FR-019/FR-002)**: every warmth input is a real owned fact; no view/like/reach/engagement/
  conversion/popularity value is read or implied.
- **Consent gate (P-VII/FR-004)**: non-granted → cold; never filtered out (`getProofs` unfiltered;
  count under Warmest == count under Newest for the same filters — FR-005).
- **Determinism (FR-007)**: total order via the final `id` tiebreak; equal inputs → identical order.
- **Read-time (FR-003)**: warmth + clip-status reflect current facts at the moment of sorting; nothing
  stored.
- **Recency consistency**: warmth's recency tiebreak uses the same `capturedAt` that "Newest" uses.
