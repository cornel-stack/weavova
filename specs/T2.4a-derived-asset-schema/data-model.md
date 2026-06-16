# Phase 1 — Data Model: T2.4a Derived-Asset Schema & Cascade

The first schema change since T0.3: **one new table** (`derived_asset`) + **two enums**, additive over
the existing `workspace`/`source`/`proof`/`consent`. Plus the **read-time withdrawal** derivation (the
P-VII cascade) and the clip view shapes the reads return. Existing entities are unchanged.

## New table: `derived_asset` (Q1→B)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK default random | |
| workspaceId | uuid NOT NULL → `workspace.id` (ON DELETE CASCADE) | scoping; matches `proof`/`source` |
| proofId | uuid NOT NULL → `proof.id` (ON DELETE CASCADE) | the source proof; hard-delete integrity |
| consentId | uuid NOT NULL → `consent.id` (ON DELETE CASCADE) | **provenance** (the consent version it was made under) + hard-delete integrity **only** — does NOT express revocation (Q2→A) |
| kind | `derived_asset_kind` NOT NULL | enum `clip` \| `carousel` \| `embed` (only `clip` produced/seeded now) |
| format | `clip_format` NOT NULL | enum `9x16` \| `1x1` \| `4x5` \| `16x9` (render contract §4 `Format`) |
| assetUrl | text NOT NULL | stored (stubbed) sample-clip reference (R2) |
| hook | text NULL | the brand-authored hook the merchant configured (owned config provenance) |
| createdAt | timestamptz NOT NULL default now() | drives "this month" + latest |

- **Indexes**: `(workspaceId, createdAt desc)` for the dashboard count/latest; `(proofId)` for the detail
  generated-assets list.
- **New enums** (closed domains → pgEnum, DB integrity, matching `proof_type`/`consent_state`):
  `derived_asset_kind` and `clip_format`.

## Relations

- `workspace` 1—* `derived_asset` (scoping).
- `proof` 1—* `derived_asset` (source).
- `consent` 1—* `derived_asset` (the version a clip was made under — provenance).
- Existing T0.3 relations unchanged.

## Effective consent & read-time withdrawal (P-VII — the cascade)

- **Effective consent** (derived, not stored — unchanged from T0.3) = the state of the proof's
  greatest-`version` consent row. Built by the shared helper
  `effectiveConsentState(proofIdColumn) = (select c.state from consent c where c.proof_id = <col> order by
  c.version desc limit 1)`, reused by the proof reads (`latestConsentState = effectiveConsentState(proof.id)`)
  and the derived-asset filter.
- **Withdrawal rule**: a `derived_asset` is **withdrawn** (excluded from every read) when
  `effectiveConsentState(derived_asset.proofId) <> 'granted'`. The row is **retained** (audit); withdrawal
  is a read-time exclusion, never a delete.
- **Why not a DB cascade**: revocation = a new `revoked` consent **version**, not a row delete, so
  `ON DELETE CASCADE` never fires on it (Q2→A). The FK cascade only handles **true hard deletes** (delete a
  proof → its consents + derived assets go — no orphans).

## Read views (returned shapes)

| View | Source | Fields |
|---|---|---|
| `LatestClipDescriptor` (reused, T2.1) | latest non-withdrawn `derived_asset` + `proof` join | `customerName`, `verified`, `createdAt` — **owned only, no view metric** |
| `clipsThisMonth` (number) | count of non-withdrawn `derived_asset`, `createdAt >= date_trunc('month', now())`, workspace-scoped | honest count (FR-019) |
| `ClipView` (new — `src/lib/clip.ts`) | a proof's non-withdrawn `derived_asset` rows | `id`, `kind`, `format`, `assetUrl`, `hook`, `createdAt` (owned) |

## Seed model (Q3→A)

| Fixture | Proof | consentId | createdAt | Read result |
|---|---|---|---|---|
| Active clip(s) | currently-**granted** proofs (e.g. Maria L., Aisha K., Greta S.) | their granted consent | this month (relative) | counted + shown |
| **Born-then-withdrawn** clip | **Leo M.** (granted ago(17) → revoked ago(6)) | his **v1 granted** consent | `ago(10)` (granted window) | **withdrawn** — absent from count/latest and his detail |

- The seed captures the inserted **granted** consent row id per proof to set `consentId`.
- Reset adds `delete(derived_asset)` (FK-safe order); relative dates (A-10) keep "this month" alive.

## Not modelled here (deferred to T8)

- The full `RenderInput` (transcript/captions, highlight, reframe, music licensing), approval state, and
  distribution/publish state — resolved upstream by the T7/T8 pipeline (render spec §4–5). Not added
  speculatively.

## Byte-stability

- Existing tables (`workspace`/`source`/`proof`/`consent`) and their data are **unchanged** (additive
  migration). `ProofView`/`ProofCardProps`/`ProofDetailView` and `getProofs`/`proofColumns`/`toView`/
  `getProof` **output** are unchanged; the only proof-path edit is `latestConsentState =
  effectiveConsentState(proof.id)` (identical SQL). ProofCard byte-unchanged.
