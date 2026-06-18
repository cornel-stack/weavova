# Phase 1 — Data Model: T-Showcase

**No schema change.** A new **reader** combining the existing `proof` and `derived_asset` (+ `consent` via
the shared gate). The data model here is (a) the new `ShowcaseItem` and (b) the `getShowcase` projection +
the read-time withdrawal derivation.

---

## 1. `ShowcaseItem` (new — `src/lib/showcase.ts`; reuses existing view shapes)

A discriminated union over the **existing**, byte-unchanged view shapes:

```text
type ShowcaseItem =
  | { kind: 'proof'; proof: ProofView }        // consented testimonial (text/video/photo/audio)
  | { kind: 'clip';  clip: LibraryClipView }   // consented generated clip (sample/preview pre-T8)
```

- `ProofView` (from `src/lib/proof.ts`) and `LibraryClipView` (from `src/lib/clip.ts`) are **byte-unchanged**;
  `ShowcaseItem` is additive.
- Both carry the **verified** mark (surfaced, not a gate — Q3) and a date (`ProofView.capturedAt` /
  `LibraryClipView.createdAt`) used for newest-first ordering.

---

## 2. The read — `getShowcase(workspaceId): Promise<ShowcaseItem[]>`

| Aspect | Definition |
|---|---|
| Consented proof | `select proofColumns from proof ⋈ source where eq(proof.workspaceId, $ws) AND effectiveConsentGranted(proof.id)` → `toView` → `ProofView[]`. Reuses the existing `proofColumns`/`toView` (read-only). **Distinct from `getProofs`** (which is unfiltered — the inbox shows all states). |
| Consented clips | The `getLibraryClips` shape — `derived_asset ⋈ proof where eq(derived_asset.workspaceId, $ws) AND effectiveConsentGranted(derived_asset.proofId)` → `LibraryClipView[]`. |
| Withdrawal (P-VII) | Both gated by the **shared** `effectiveConsentGranted` — visibility identical to the dashboard/Library. A withdrawn proof (and therefore its clips) is **absent**. |
| Merge + order | Wrap into `ShowcaseItem` discriminants; **sort newest-first** by item date. One mixed list. |
| Reliability | One `withDbRetry` block (two queries). |
| Count | Honest = `items.length` (already withdrawal-filtered) — FR-005/SC-008. |

**Audit**: withheld proof/clips' rows are **retained** — the read filters, never deletes ("pull, don't
destroy").

**Owned only** (FR-019): the projections carry only owned fields (customer, words/quote or clip sample +
format/hook, verified, source, date) — no view/reach/likes/social/published metric.

---

## 3. Existing entities (unchanged — referenced only)

- **Proof** (T0.3): consented testimonials on the wall; current effective consent gates visibility.
- **Derived asset / clip** (T2.4a): consented clips on the wall (sample/preview pre-T8).
- **Consent** (T0.3): the **effective** state governs wall visibility via the shared helper. Never modified.
- **NOT modelled here**: any showcase membership / "live"/published flag, view/social metric, embed/public-URL
  artifact — all T9 (the coupled curate+publish cluster); not fabricated (FR-019, A-11).

No new tables, columns, enums, or indexes. No migration. One added read; one added item type.
