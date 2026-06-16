# Implementation Plan: T2.4a — Derived-Asset Schema, Revocation Cascade & Seed

**Branch**: `main` (a `T2.4a-derived-asset-schema` branch is created at `/speckit.implement`, not for planning) | **Date**: 2026-06-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T2.4a-derived-asset-schema/spec.md`

**Guardrail**: PLAN only. Do **not** run `/speckit.tasks` or implement. Stop and report after Phase 2 planning.

## Summary

The first schema change since T0.3: add the **`derived_asset`** table T0.3 documented — a generated clip
linked to its **source proof** and the **consent it was made under** — plus a committed Drizzle migration
(applied via the established neon-http migrator), honest seed fixtures (incl. cascade coverage), a
workspace-scoped `withDbRetry` read, and the swap of the deferred `// T2.4` markers (dashboard "clips
this month" + latest-clip, and the proof detail's "Generated assets") to real data.

The **constitution-critical** decision (Q2→A): **revocation is read-time withdrawal**, not a DB
delete-cascade. Because T0.3 models revocation as a **new `revoked` consent version, never a row delete**,
an `ON DELETE CASCADE` on `derived_asset.consentId` **never fires on revocation** — it is kept only for
**provenance + hard-delete integrity**. Withdrawal is enforced **at read time** by the proof's
**effective** consent: every `derived_asset` read excludes assets whose proof's effective consent is not
"granted", and the asset row is **retained for audit** ("pull, don't destroy" — render spec §7.2). To
guarantee the withdrawal logic **mirrors** the existing proof effective-consent logic, the plan extracts
a shared `effectiveConsentState(proofIdColumn)` SQL helper and uses it for **both** the proof reads and
the derived-asset filter — a behaviour-preserving refactor (the proof reads' generated SQL and
`ProofView`/`getProofs` output are unchanged). The seed reuses **Leo M.'s granted→revoked lineage** to
encode a **born-then-withdrawn** clip alongside active clips under granted proofs, so the cascade is
observable in static data. ProofCard and the shared `ProofView`/`getProofs` stay byte-stable; the parked
T2.4b studio is untouched. No new dependency.

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Next.js 15.5 (App Router, `--turbopack`).

**Primary Dependencies**: Existing only — `next`, `react`, `drizzle-orm`, `drizzle-kit`,
`@neondatabase/serverless`, `lucide-react`. **No new dependency.**

**Storage**: Neon Postgres via the lazy `getDb()` + Drizzle. **Schema change** (additive: one new table +
two enums) via `drizzle-kit generate` → committed `./drizzle/0001_*.sql` → applied by the neon-http
migrator (`src/db/migrate.ts`), exactly as T0.3.

**Testing**: No unit-test runner (as in T0.3/T2.x). Verification = `npm run typecheck`/`lint`/`build`,
`db:generate`/`db:migrate` applying cleanly, the re-runnable seed, and the `quickstart.md` checks (the
cascade observed on the dashboard/detail, byte-stability, no new dep).

**Target Platform**: Vercel; modern browsers. `/app/*` is `force-dynamic`; the build is green **without**
`DATABASE_URL` (lazy client; the migration/seed are separate steps, not part of build).

**Performance Goals**: Single-digit small reads at demo scale; the dashboard adds two small derived-asset
reads; the detail adds one. Correlated subquery for effective consent (as today) — negligible at scale.

**Constraints**: Drizzle only; `withDbRetry` on every read; workspace-scoped; honest counts (FR-019); no
new dependency; ProofCard + shared `ProofView`/`getProofs` byte-stable; the studio (T2.4b) not built.

**Scale/Scope**: One new table + migration + seed; three read additions (dashboard count, dashboard latest
clip, detail generated-assets); the dashboard marker swap (queries-only) and a small detail
generated-assets section.

## Constitution Check

*GATE: re-checked after Phase 1 (below). All gates PASS.*

- [x] **Customer is the headline (P-II)**: No new chrome; the lit-up read surfaces (dashboard clip cells,
      detail generated-assets) keep the proof/customer primary and the counts quiet. No clip is shown
      that isn't honestly the customer's consented proof.
- [x] **Locked stack (P-III)**: Neon + Drizzle + the established neon-http migrator; R2 reference for the
      sample clip. **No new dependency.** Heavy render stays off Vercel (assets point at the stubbed
      sample; the real engine is T8).
- [x] **Pressroom tokens (P-IV)**: The one new UI piece (the detail generated-assets section) uses only
      on-token utilities; no persimmon beyond the established rules.
- [x] **Port, don't redesign (P-V)**: The `derived_asset` shape is **ported from the T0.3-documented
      design** + render contract §4 (the owned subset); no new screen designed — the existing dashboard/
      detail read surfaces light up. The detail generated-assets section is the screen-03 "Generated
      assets" data finally arriving (T2.3 deferred it with this exact swap point).
- [x] **Fixtures-first (P-VI)**: The defining principle here — **schema written before the screen that
      writes it** (the studio T2.4b). The `derived_asset` fixture shape is the schema contract; the
      dashboard/detail read it over the seed; real generate (T2.4b) + render (T8) swap in behind the same
      reads.
- [x] **Consent enforcement (P-VII)**: The heart of the slice — see "P-VII: read-time withdrawal" below.
      `derived_asset.consentId` makes the link first-class; **read-time effective-consent withdrawal**
      ensures no clip surfaces for non-granted proof and no clip outlives its consent; the row is retained
      for audit; hard-delete integrity via the FKs.
- [x] **No editor (P-VIII)**: N/A — no studio/editor in this slice.
- [x] **SDD scope (P-IX, P-XI)**: One foundation slice — table, migration, seed, reads, marker swaps. The
      studio UI/generate (T2.4b), real render (T8), publishing, and batch are out of scope. No speculative
      columns — only the owned Q1→B set; T8 pipeline fields deferred.
- [x] **Ambiguity handling (P-XII)**: The three schema/cascade ambiguities (columns / cascade behaviour /
      seed-verification) were resolved with the human (Q1→B, Q2→A, Q3→A) and folded into the spec.

**Definition of done (P-Governance)**: renders on real (fixture) data (the lit-up cells/section); handles
empty (honest zero-clip) states; responsive + on-token (the detail section); keyboard-accessible; passes
acceptance criteria; migration applies cleanly; builds green. Tracked in `quickstart.md`.

## Architecture & Data Flow

### The `derived_asset` table (Q1→B — owned columns only)

```text
derived_asset
  id           uuid PK default random
  workspaceId  uuid NOT NULL → workspace.id  (ON DELETE CASCADE)      -- scoping (matches proof/source)
  proofId      uuid NOT NULL → proof.id       (ON DELETE CASCADE)      -- source proof; hard-delete integrity
  consentId    uuid NOT NULL → consent.id     (ON DELETE CASCADE)      -- PROVENANCE + hard-delete integrity ONLY
  kind         derived_asset_kind NOT NULL                              -- enum: 'clip' | 'carousel' | 'embed' (seed: 'clip')
  format       clip_format NOT NULL                                     -- enum: '9x16' | '1x1' | '4x5' | '16x9'
  assetUrl     text NOT NULL                                            -- stored (stubbed) sample-clip reference (R2)
  hook         text NULL                                                -- the brand-authored hook the merchant configured (owned provenance)
  createdAt    timestamptz NOT NULL default now()
  -- indexes: (workspaceId, createdAt desc) for dashboard count/latest; (proofId) for the detail list
```

- Two new **pgEnum**s (closed domains, DB integrity — consistent with `proof_type`/`consent_state`):
  `derived_asset_kind` (`clip`/`carousel`/`embed` — only `clip` is produced/seeded now; the others are
  type tags, not features) and `clip_format` (`9x16`/`1x1`/`4x5`/`16x9` — render contract §4 `Format`).
- **`consentId` semantics (Q2→A)**: records the **consent version the clip was made under** (provenance:
  "made under consent vN"). Its `ON DELETE CASCADE` is for **hard deletes only** (delete a proof →
  cascade deletes its consent rows and derived assets — no orphans). It does **NOT** express revocation
  (revocation inserts a new `revoked` version; nothing is deleted).
- **No T8 pipeline fields** (transcript/captions, highlight, reframe, music licensing, approval/
  distribution) — resolved upstream, deferred (render spec §4–5).

### P-VII: read-time withdrawal via effective consent (the constitution-critical core)

- **Effective consent helper (shared, mirrors the proof logic)**: extract
  `effectiveConsentState(proofIdColumn)` — the correlated subquery
  `(select c.state from consent c where c.proof_id = <col> order by c.version desc limit 1)` — and
  **reuse it for both**:
  - the existing proof reads: `latestConsentState = effectiveConsentState(proof.id)` — a
    **behaviour-preserving** refactor (identical generated SQL; `proofColumns`/`toView`/`getProofs` lines
    and `ProofView` output unchanged); and
  - the derived-asset **withdrawal filter**: `effectiveConsentState(derived_asset.proofId) = 'granted'`.
- **Every `derived_asset` read applies the withdrawal filter** — `where … AND
  effectiveConsentState(derived_asset.proofId) = 'granted'` — so a clip whose proof's effective consent is
  revoked/awaiting is **excluded** from the count, the latest-clip, and the proof's generated assets. The
  **row is retained** (audit); withdrawal is purely a read-time exclusion.
- **Why not `ON DELETE CASCADE` for revocation**: revocation = a new `revoked` consent version, never a
  delete, so the FK cascade never fires on it (Q2→A; T0.3 append-only model). The read-time gate is the
  honest P-VII expression and mirrors how the Make gate already works (`effectiveConsent === 'granted'`).
- **A stored `status` flag is deliberately deferred** (Q2 option B) until the revocation *operation*
  exists (T7+ consent management) — it would layer on top of this read gate without reshaping it.

### The reads (workspace-scoped, `withDbRetry`)

1. **Dashboard (swap `getDashboardSummary` markers, queries-only)** — inside the existing `withDbRetry`
   block, replace `clipsThisMonth: 0` and `latestClip: null`:
   - `clipsThisMonth` = `count(*)` of `derived_asset` where `workspaceId = ws` AND
     `createdAt >= date_trunc('month', now())` AND `effectiveConsentState(proofId) = 'granted'` (calendar
     month, real `now()`).
   - `latestClip` = the most recent non-withdrawn `derived_asset` (join `proof` for `customerName` +
     `verified`), `order by createdAt desc limit 1` → the existing `LatestClipDescriptor`
     (`customerName`, `verified`, `createdAt`) — **owned fields only, no view metric** (FR-010/019).
   - `dashboard-kpis.tsx` is **unchanged** — it already consumes `summary.clipsThisMonth` /
     `summary.latestClip` and renders the honest-empty path at `0`/`null`.
2. **Detail (new read + small UI)** — `getProofClips(workspaceId, proofId): Promise<ClipView[]>`: select
   `derived_asset` where `workspaceId = ws` AND `proofId = proofId` AND
   `effectiveConsentState(proofId) = 'granted'`, `order by createdAt desc`, projecting the owned clip view
   (`id`, `kind`, `format`, `assetUrl`, `hook`, `createdAt`). Withdrawn (Leo M.) → empty list.

### The seed (Q3→A — born-then-withdrawn + active)

- The seed inserts consent rows; to set `derived_asset.consentId` it must **capture the inserted consent
  row id** (the granted version each clip is made under). The seeding loop records, per proof, the id of
  its **granted** consent version.
- **Active clips**: seed a clip for a few currently-**granted** proofs (e.g. Maria L., Aisha K., Greta
  S.), `kind='clip'`, `format='9x16'`, `assetUrl` = the sample-clip reference, a brand `hook`, `createdAt`
  **this month** (relative dates, A-10) → counted + shown.
- **Born-then-withdrawn clip (cascade coverage)**: seed **one** clip under **Leo M.** (granted ago(17) →
  revoked ago(6)) made during his **granted window** — `consentId` = his **v1 granted** consent,
  `createdAt` = e.g. `ago(10)` (after grant, before revoke). His effective consent is now **revoked**, so
  this clip is **withdrawn** by the read gate — present in the table (audit), absent from every read.
- **Re-runnable**: extend the seed's FK-safe reset to `delete(derivedAsset)` first; relative dates keep
  "this month" alive across reseeds (A-10).

### The detail "Generated assets" UI (marker swap)

- `proof-detail-data.tsx` (T2.3) additionally calls `getProofClips(ws.id, id)` after the proof resolves
  (the proof is fetched first; `null → notFound()` unchanged), and passes the clips into `<ProofDetail>`.
- `proof-detail.tsx` (T2.3) renders a **"Generated assets"** section in the content column **only when the
  list is non-empty** (honest-empty/absent otherwise — no fabricated "· N"), via a new Server component
  `proof-detail-generated-assets.tsx` (list of the proof's clips: format/kind + created date + an honest
  reference to the sample clip; owned data only).

### Byte-stability (asserted)

- **ProofCard** byte-unchanged. **`ProofView` / `ProofCardProps` / `getProofs` / `proofColumns` / `toView`
  output unchanged** — the only `queries.ts` edit to the proof path is redefining `latestConsentState =
  effectiveConsentState(proof.id)` (identical SQL; behaviour-preserving). **`getProof` / `ProofDetailView`
  unchanged** — clips are a **separate** read, not folded in. **Session seam / existing tables/data**
  unchanged (additive migration). The parked **T2.4b** studio does not exist yet — untouched.

## Project Structure

### Documentation (this feature)

```text
specs/T2.4a-derived-asset-schema/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions (cascade-as-read-gate, shared effective-consent helper, enums, seed)
├── data-model.md        # Phase 1 — derived_asset table + the withdrawal derivation + clip views
├── contracts/
│   ├── derived-asset-schema.md   # the table + enums + FK/cascade semantics (provenance vs revocation)
│   └── clip-reads.md             # getDashboardSummary swap + getProofClips + the withdrawal filter
├── quickstart.md        # Phase 1 — migrate + seed + observe the cascade; DoD checks
└── checklists/requirements.md    # (from /speckit.specify)
```

### Source Code — files this slice adds / changes

```text
src/
├── db/
│   ├── schema.ts            # CHANGE: ADD derived_asset table + derived_asset_kind + clip_format enums (existing tables untouched)
│   ├── queries.ts           # CHANGE: ADD effectiveConsentState() helper (refactor latestConsentState to it — identical SQL);
│   │                        #         swap getDashboardSummary clipsThisMonth/latestClip to real reads; ADD getProofClips()
│   └── seed.ts              # CHANGE: ADD derived_asset seeding (capture granted consentId; active clips + Leo M. withdrawn clip); reset adds delete(derivedAsset)
├── lib/clip.ts              # ADD: ClipView (the detail generated-assets shape) + clip enum types
├── components/app/proof-detail/
│   ├── proof-detail-data.tsx        # CHANGE: also getProofClips(ws,id); pass clips into <ProofDetail>
│   ├── proof-detail.tsx             # CHANGE: render the "Generated assets" section (accept clips prop) — content column
│   └── proof-detail-generated-assets.tsx  # ADD: Server — the proof's clips list (honest-empty when none)
└── (drizzle/)
    ├── 0001_*.sql           # ADD: generated migration for derived_asset + enums (committed)
    └── meta/                # ADD/UPDATE: drizzle journal/snapshot for 0001

# UNCHANGED (asserted in quickstart DoD checks):
#   src/components/proof-card.tsx                              (byte-identical — FR-012)
#   src/lib/proof.ts → ProofView, ProofCardProps, ProofDetailView   (shared shapes unchanged)
#   src/db/queries.ts → getProofs, proofColumns, toView, getProof, toDetailView   (output unchanged; latestConsentState refactor is behaviour-identical)
#   src/components/app/dashboard/dashboard-kpis.tsx           (already consumes clipsThisMonth/latestClip — data-only swap)
#   src/db/with-retry.ts, src/lib/session.ts                  (reused / seam untouched)
#   src/db/schema.ts existing tables (workspace/source/proof/consent)   (additive migration only)
#   specs/T2.4b-clip-studio/                                  (parked; not built)
```

**Structure Decision**: Single Next.js App Router project. The schema/migration/seed/reads live in the
existing `src/db/` layer (T0.3 pattern); the clip view type in a new `src/lib/clip.ts` (mirroring
`src/lib/proof.ts`); the one new UI piece under the existing `src/components/app/proof-detail/`.

## Phase 0 — Outline & Research

All Technical Context items are known; research resolved the design choices the spec's Q1–Q3 fixed (full
write-up in `research.md`):

- **D1 — Cascade = read-time withdrawal, not `ON DELETE CASCADE` (Q2→A)**: revocation is a new version,
  not a delete, so the DB cascade never fires on it; withdrawal is a read-time effective-consent filter;
  the FK stays for provenance + hard-delete integrity; the row is retained (audit). Chosen over a hard
  cascade (insufficient + destroys the trail) or a stored `status` flag (needs a revocation operation that
  doesn't exist yet).
- **D2 — Shared `effectiveConsentState(proofIdColumn)` helper**: one correlated-subquery builder reused by
  the proof reads (refactor `latestConsentState`, behaviour-identical) and the derived-asset filter, so
  the withdrawal logic provably mirrors the proof effective-consent logic. Chosen over a parallel,
  duplicated subquery (risk of drift).
- **D3 — Owned columns only (Q1→B)**: `id, workspaceId, proofId, consentId, kind, format, assetUrl, hook,
  createdAt`; two pgEnums; no T8 pipeline fields. Chosen over modelling `RenderInput` now (speculative).
- **D4 — Seed reuses Leo M.'s granted→revoked lineage (Q3→A)**: a born-then-withdrawn clip + active clips;
  cascade observable in static data; verified by observation + build/migration checks.
- **D5 — Reuse the existing reads/reliability**: extend `getDashboardSummary` (queries-only swap), add
  `getProofClips`, reuse `withDbRetry`; `dashboard-kpis.tsx` unchanged.

**Output**: `research.md` (no NEEDS CLARIFICATION remain — Q1–Q3 resolved in the spec).

## Phase 1 — Design & Contracts

- **`data-model.md`**: the `derived_asset` table (columns, enums, FKs, indexes), the **read-time
  withdrawal** derivation (effective consent), and the clip view shapes (`LatestClipDescriptor` reused;
  `ClipView` for the detail). No change to existing entities.
- **`contracts/derived-asset-schema.md`**: the table + enums + the FK/cascade **semantics** (provenance +
  hard-delete vs revocation-by-read-gate), and the additive-migration guarantee.
- **`contracts/clip-reads.md`**: the `getDashboardSummary` marker swap, `getProofClips`, the shared
  `effectiveConsentState` helper + withdrawal filter, and the byte-stability assertions.
- **`quickstart.md`**: `db:generate` → commit `0001` → `db:migrate` → `db:seed`; open the dashboard (clips
  this month + latest clip lit) and proofs' details (granted proof shows clips; **Leo M. shows none** —
  withdrawn); DoD gates (ProofCard/ProofView/getProofs byte-stable, no new dep, build green without
  `DATABASE_URL`, migration additive).
- **Agent context**: update the `<!-- SPECKIT START/END -->` pointer in `CLAUDE.md` to this plan and mark
  T2.4a the active slice.

**Re-check Constitution after Phase 1**: still all PASS — additive schema, no new dependency, P-VII
expressed as read-time withdrawal (audit-preserving), ProofCard/ProofView/getProofs/seam byte-stable,
honest counts (FR-019), the studio (T2.4b) untouched.

## Complexity Tracking

No constitution violations to justify — the table is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
