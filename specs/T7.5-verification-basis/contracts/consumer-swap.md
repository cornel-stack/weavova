# Contract — The byte-stable consumer swap (P-V regression surface)

Every site that currently reads `proof.verified` (or a `verified` flag derived from it) routes through
the resolver. **Byte-stable for all existing fixtures** — the only new pixel is the `consent_only`
label on proof detail.

## The two layers

- **Query/seed/resolver layer (changes here)** — where `verified` stops being raw and becomes derived.
- **Component layer (mostly unchanged)** — reads the resolver-fed `view.verified` boolean exactly as
  before; one component adds the in-between label.

## SQL projection sites (`src/db/queries.ts`) — swap raw → resolver-fed

| Line(s) (current) | Projection | Change |
|-------------------|-----------|--------|
| `130` (`proofColumns`) | proof list/card + detail base | drop `verified: proof.verified`; add internal `hasQualifyingBasis: qualifyingBasisExpr(proof.id)`; `toView` computes `verified` via `proofIsVerified` |
| `161` (`toView`) | row → `ProofView` | compute `verified = proofIsVerified({ consentState, hasQualifyingBasis })` |
| `254`-area (`getProof` detail projection) | proof detail | also compute `verificationState`; set on `ProofDetailView` |
| `380, 397` | dashboard latest-proof / hero read | same swap (consent already gated) |
| `616, 637` | clip read (library/showcase clip → source proof verified) | drop `verified: proof.verified`; add `hasQualifyingBasis`; mapper computes `verified` |
| `677, 713` | clip detail read | same |
| `962, 992` | export package read | same |

(Exact line numbers will drift during edit — the contract is "no `proof.verified` select remains;
each projection feeds the resolver".)

## View types (`src/lib/proof.ts`, `src/lib/clip.ts`, `src/lib/export.ts`)

| Type | Field | Change |
|------|-------|--------|
| `ProofView` | `verified: boolean` | unchanged shape; value now resolver-computed |
| `ProofDetailView` | `verified: boolean` + **NEW** `verificationState: VerificationState` | additive field for the detail label |
| `LibraryClipView` | `verified: boolean` | unchanged shape; resolver-computed |
| `ClipDetailView` | `verified: boolean` | unchanged shape; resolver-computed |
| `PostTextPackage` | `verified: boolean` | unchanged shape; resolver-computed |

## Component read sites (11) — render impact

| # | Component | Reads | Render change |
|---|-----------|-------|---------------|
| 1 | `src/components/proof-card.tsx` | `verified` | **none** (stamp or absence — already the behavior) |
| 2 | `src/components/app/proof-detail/proof-detail-meta.tsx` | `verified` → `verificationState` | **NEW**: `consent_only` → quiet "Consent recorded · transaction unconfirmed" label; `verified` → stamp (unchanged) |
| 3 | `src/components/app/dashboard/dashboard-hero.tsx` | `verified` | **none** |
| 4 | `src/components/app/showcase/showcase-item.tsx` (proof) | `verified` | **none** |
| 5 | `src/components/app/showcase/showcase-item.tsx` (clip) | `clip.verified` | **none** |
| 6 | `src/components/app/clip-studio/clip-studio.tsx` | `proof.verified` | **none** |
| 7 | `src/components/app/clip-detail/clip-detail.tsx` | `clip.verified` | **none** |
| 8 | `src/components/app/library/library-clip-card.tsx` | `clip.verified` | **none** |
| 9 | `src/lib/export.ts` (attribution) | `pkg.verified` | **none** |
| 10 | `src/db/queries.ts` (projections) | — | the swap above |
| 11 | `src/db/seed.ts` | `Fixture.verified` | drives basis backfill, not `proof.verified` (D7) |

## Byte-stability guarantee

For every existing fixture, `proofIsVerified` reproduces the prior `proof.verified`:

- 5 verified fixtures → granted consent + backfilled **strong** basis → `verified=true` → **stamp**
  (identical to before — SC-002).
- every previously-unverified fixture → consent not granted **or** no qualifying basis → `verified=false`
  → **no stamp** (identical to before).

Therefore sites 1, 3–9 are pixel-identical. **The single visible change**: site 2 (proof detail) shows
the new `consent_only` label for granted-consent-but-unverified proofs (Marcus, Yuki, Caleb, Nadia,
Priya) — the honest in-between (SC-006).

## P-VII boundary check (must hold)

Leo M. (consent revoked v2) → `verificationState = unverified_no_consent` even if seeded a `strong`
basis → no stamp, no label; the existing consent meta shows "revoked". (SC-004.)
