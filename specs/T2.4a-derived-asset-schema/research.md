# Phase 0 — Research: T2.4a Derived-Asset Schema, Cascade & Seed

Technical Context is fixed by the locked stack; the three schema/cascade ambiguities were resolved with
the human (Q1→B, Q2→A, Q3→A). This file records the plan-level design decisions. No `NEEDS CLARIFICATION`
remain.

## D1 — The revocation cascade is READ-TIME withdrawal, not `ON DELETE CASCADE` (Q2→A, P-VII-critical)

- **Decision**: A clip is **withdrawn** when its source proof's **effective** consent is not "granted",
  enforced **at read time** (every `derived_asset` read filters on effective consent). The
  `derived_asset.consentId → consent.id` FK is kept with `ON DELETE CASCADE` for **provenance + hard-delete
  integrity only**. The asset **row is retained** on revocation (audit trail).
- **Rationale**: T0.3 models revocation as a **new `revoked` consent version, never a row delete** (append-
  only, auditable). So a DB `ON DELETE CASCADE` on `consentId` **never fires on revocation** — it would
  only act on a true hard delete. The honest P-VII expression is therefore the read-time effective-consent
  gate — identical in spirit to the existing Make gate (`effectiveConsent === 'granted'`) — and it
  preserves the audit trail ("pull, don't destroy" — render spec §7.2 two-tier revocation).
- **Alternatives rejected**: (a) hard `ON DELETE CASCADE` as the revocation mechanism — insufficient
  (revocation isn't a delete) and would destroy the audit trail on a real delete; (b) a stored
  `status` (`active`/`withdrawn`) flag — needs a revocation *operation* that doesn't exist until consent
  management (T7+); deferred, can layer on top of the read gate later without reshaping.

## D2 — A shared `effectiveConsentState(proofIdColumn)` helper (mirror the proof logic)

- **Decision**: Extract one correlated-subquery builder
  `effectiveConsentState(col) = (select c.state from consent c where c.proof_id = <col> order by c.version
  desc limit 1)` and reuse it for **both** the proof reads and the derived-asset withdrawal filter.
  `latestConsentState` becomes `effectiveConsentState(proof.id)` (a **behaviour-preserving** refactor —
  identical generated SQL), and the clip filter is `effectiveConsentState(derived_asset.proofId) =
  'granted'`.
- **Rationale**: The user requirement — the withdrawal logic must **mirror** the existing `ProofView`
  effective-consent logic and be reused consistently. One source of truth eliminates drift (e.g. a future
  tie-break change applies to both). The proof reads' output (`ProofView`, `getProofs`) is unchanged.
- **Alternatives rejected**: a second, duplicated subquery for derived assets (drift risk — two places to
  keep identical); a stored "effective consent" column (denormalization + invalidation complexity, and
  T0.3 deliberately keeps effective consent **derived, not stored**).

## D3 — Owned columns only (Q1→B)

- **Decision**: `derived_asset` carries `id, workspaceId, proofId, consentId, kind, format, assetUrl,
  hook, createdAt`. Two pgEnums: `derived_asset_kind` (`clip`/`carousel`/`embed`) and `clip_format`
  (`9x16`/`1x1`/`4x5`/`16x9`). No T8 pipeline fields.
- **Rationale**: Exactly what the stub + the dashboard/detail reads + the cascade need, plus the owned
  brand-`hook` provenance the studio (T2.4b) captures. Enums match the schema's closed-domain idiom
  (`proof_type`/`consent_state`) for DB integrity. The full `RenderInput` (transcript/highlight/reframe/
  music/approval/distribution) is resolved upstream and is **T8** — not modelled now (render spec §4–5).
- **Alternatives rejected**: modelling `RenderInput` now (speculative — empty/unused columns, violates
  "no speculative work"); `text` for `kind`/`format` (loses DB-level integrity the enums give).
- **Note**: `carousel`/`embed` are type tags only (the studio produces `clip`); seeding uses `clip`.
  `workspaceId` is denormalized for direct scoping (consistent with `proof`/`source` carrying it), even
  though it is derivable via `proofId → proof.workspaceId`.

## D4 — Seed reuses Leo M.'s granted→revoked lineage (Q3→A)

- **Decision**: Seed **active** clips under currently-granted proofs (counted/shown) and **one
  born-then-withdrawn** clip under **Leo M.** — made during his granted window (`consentId` = his v1
  granted consent; `createdAt` between grant and revoke) — now withdrawn because his effective consent is
  revoked. Relative dates (A-10); the seed reset additionally deletes `derived_asset`.
- **Rationale**: The cascade is demonstrable in **static** seed data — no revocation operation needed —
  reusing honest existing fixtures. One clip proves both "born under granted consent" and "withdrawn on
  revocation". Verified by observation + `typecheck`/`lint`/`build` + a migration-applies check.
- **Alternatives rejected**: a dedicated new granted→revoked lineage (duplicates Leo M.'s pattern; more
  fixtures); a scripted cascade assertion (new tooling the repo doesn't use — a possible later add, C).
- **Seeding detail**: the seed must **capture the inserted granted consent row id** per proof to set
  `derived_asset.consentId` (the loop already inserts consent rows; it now records their ids).

## D5 — Reuse the existing reads + reliability

- **Decision**: Extend `getDashboardSummary` in place (swap `clipsThisMonth: 0` / `latestClip: null` for
  real derived-asset reads inside its existing `withDbRetry` block); add `getProofClips(workspaceId,
  proofId)`; reuse `withDbRetry` and workspace-scoping. `dashboard-kpis.tsx` is unchanged (it already
  consumes the summary fields and renders the honest-empty path).
- **Rationale**: These already encode the dashboard's read + reliability; the markers were placed at T2.1
  for exactly this swap. The detail's generated-assets is a small additive read + section.
- **Alternatives rejected**: folding clips into `getProof`/`ProofDetailView` (would change the T2.3 detail
  contract — keep it byte-stable; clips are a separate concern/read); a bespoke clip-reliability path
  (duplication).
