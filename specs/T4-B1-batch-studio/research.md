# Phase 0 — Research: T4-B1 Batch studio

The spec's Q1–Q3 are resolved, so no `NEEDS CLARIFICATION` remain. This file records the implementation
design decisions (D1–D5).

---

## D1 — Selection is a sibling overlay; ProofCard byte-unchanged

**Decision**: Add per-proof selection as a **sibling overlay** on each inbox card (in `inbox-wall.tsx`),
exactly as the T2.2 stretched-link nav sits beside the byte-unchanged `ProofCard`. In selection mode the
overlay is a toggle (granted) or a non-interactive **"needs consent"** badge (non-granted); the nav link is
**suppressed** while selecting.

**Rationale**: T2.2 FR-014c deferred selection precisely because `ProofCard` carries no selection prop and is
byte-frozen. A sibling overlay adds selection without touching the card — `ProofView` already exposes `id` +
`consentState`, all the overlay needs. Suppressing nav in selection mode prevents a select-click from
leaving the inbox.

**Alternatives considered**: Add a `selected`/`onSelect` prop to ProofCard (breaks byte-stability —
rejected). A separate selection list/route (loses the in-inbox B1 design — rejected, Q3).

---

## D2 — `generateBatch` reuses the T2.4b machinery; doesn't fork (and isn't N× generateClip)

**Decision**: A new `generateBatch` Server Action loops the selected proofs and, per proof, calls the
**same** building blocks the single-clip `generateClip` uses — `validateGenerateInput`, `getGrantedConsentId`,
`insertDerivedAsset`, `SAMPLE_CLIP_URL`. `generateClip` itself is **unchanged**.

**Rationale**: Reuse keeps the single-attempt insert (D4), the input guard, and the honest stub identical to
the single-clip path — no divergent generate logic. It is **not** implemented as N calls to `generateClip`
because that would `revalidatePath` N times and couldn't return a per-proof result; `generateBatch`
revalidates **once** and returns the per-proof outcome.

**Alternatives considered**: A second, bespoke insert path (drift risk — rejected). N× `generateClip` (N
revalidations, no aggregate result — rejected).

---

## D3 — P-VII re-checked per proof, at generate (not cached from selection)

**Decision**: For each selected proof, `generateBatch` re-reads current effective consent via
`getGrantedConsentId` **at generate**; only `granted` writes. Non-granted is also un-selectable up front
(Q2 — "needs consent", "Select all ready" = granted).

**Rationale**: Consent Is Sacred (P-VII) at batch scale. Re-checking at generate covers the
**revoked-after-select** race (a proof granted when selected but revoked before "Make clips"). The up-front
un-selectability (Q2) is belt-and-braces + faithful to B1; the generate-time gate is the actual guarantee.

**Alternatives considered**: Trust the selection-time consent (a stale clip could be written if revoked
between — rejected). Filter only at generate with any proof selectable (valid — Q2 option B — but the human
chose un-selectable up front to match B1).

---

## D4 — Honest partial result; no all-or-nothing

**Decision**: Each per-proof insert is its own single attempt; `generateBatch` returns a `BatchResult` of
per-proof outcomes (made / skipped+reason / error) + tallies. No transaction, no rollback, no fabricated
success.

**Rationale**: At batch scale partial outcomes are normal; honesty (FR-019) requires reporting exactly what
happened — made clips persist, skipped/failed are reported, not faked. An insert is non-idempotent (D4), so
single-attempt + honest "failed (try again)" is correct; a batch transaction would falsely couple
independent clips.

**Alternatives considered**: All-or-nothing batch transaction (couples independent inserts; a fiction at the
product level — rejected). Retry-wrapping inserts (double-write risk — rejected, D4).

---

## D5 — No read change, no new route

**Decision**: The made clips surface on the Library, dashboard, and showcase through the **existing reads**
(`getLibraryClips` / `getDashboardSummary` / `getShowcase` / `getProofClips`) after `generateBatch`
revalidates the affected paths once. The flow lives **inline in the inbox** — no new route (Q3). No
`queries.ts` change.

**Rationale**: The batch only writes `derived_asset` rows the existing reads already withdrawal-filter and
count — so nothing in the read layer changes. B1 is the inbox in selection mode, so the inline action bar is
the faithful home; a dedicated batch route has no design-reference basis.

**Alternatives considered**: A new batch read / batch entity (unnecessary — rejected). A dedicated batch
route (no design basis — rejected, Q3).

---

**Output**: all design decisions resolved; proceed to Phase 1 design artifacts.
