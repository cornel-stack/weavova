# Feature Specification: Derived-Asset Schema, Revocation Cascade & Seed

**Feature Branch**: `T2.4a-derived-asset-schema`

**Created**: 2026-06-16

**Status**: Draft

**Tier**: T2 — The spine (T2.4a — the data layer for the clip studio; ships **before** the studio UI
T2.4b, per Q1→B: schema written before the screens that read it, P-VI)

**Input**: User description: "T2.4a — Derived-asset schema, revocation cascade & seed (the data layer
for the clip studio). The FIRST schema change since T0.3, carrying the constitution-critical revocation
cascade, shipped as its own careful, tested slice before the studio UI. Add the `derived_asset` table
T0.3 documented (with `consentId` FK + revocation cascade), a committed migration, honest seed fixtures
(incl. cascade coverage), a workspace-scoped read for the dashboard + detail, and swap the deferred
T2.4 markers to real data."

**Derived from**: CLAUDE.md (§4 architecture, §8 build plan), the constitution (P-VI fixtures-first,
P-VII consent), the **T0.3 schema** (`specs/T0.3-schema-fixtures/` — which already documents this table's
FK + cascade shape and the append-only, versioned consent model), and `docs/Weavova-Render-Proof-Spec.md`
(§4 the `RenderInput` shape, §7.2 two-tier revocation).

---

## Overview

This slice builds the **data layer** the clip studio needs, as its own foundation slice. It adds the
**`derived_asset`** table that T0.3 documented but deliberately did not create — a generated asset (a
clip) linked to the **source proof** and to the **consent it was made under** — and wires the
**constitution-critical revocation behaviour**: a clip may never outlive the consent that authorised it.
Because this is the **first schema change since T0.3** and the place where the consent→derived-asset
relationship modelled at T0.3 first does real work (P-VII), it ships **before** the studio UI (T2.4b),
so the schema is written and proven before the screen that writes to it exists.

There is **no new screen and no generate flow** here (those are T2.4b). The user-visible effect is that
the **existing** read surfaces — the dashboard's "clips this month" + latest-clip cells and the proof
detail's "Generated assets" — stop being honest placeholders (`0` / empty / hidden, the `// T2.4` swap
markers) and **light up from real seeded `derived_asset` data**, governed by consent. A clip whose
proof's consent has been revoked is **withdrawn** (not counted, not shown), demonstrating the cascade in
static seed data.

This slice is **fixtures-first**: it seeds a handful of honest derived assets (clips of already-consented
proofs, pointing at the stubbed sample clip in object storage), with relative dates so the demo stays
alive, including coverage that makes the revocation cascade observable. All counts are honest (FR-019):
they reflect only owned data, never fabricated, and never a view/reach/engagement metric.

It does **not** build the studio UI / generate flow (T2.4b), the real render engine, transcription,
publishing, or the batch studio — and it adds **no new dependency** (it uses the established Drizzle +
neon-http migration path from T0.3 and the existing R2 reference).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The dashboard reflects generated clips from real data (Priority: P1)

A workspace owner opens the dashboard and the "clips this month" count and the latest-clip cell show
**real** values computed from the workspace's generated clips — replacing the honest `0` / empty
placeholders — when clips exist.

**Why this priority**: The dashboard's clip cells are the most visible `// T2.4` swap markers; lighting
them honestly is the headline outcome of building the data layer. It is the MVP-visible proof the layer
works.

**Independent Test**: With seeded derived assets, open the dashboard; confirm "clips this month" shows
the real count of this month's non-withdrawn clips and the latest-clip cell shows the most recent
non-withdrawn clip (customer + date, **no** view/engagement number) — all computed from data, nothing
hardcoded.

**Acceptance Scenarios**:

1. **Given** a workspace with seeded clips this month, **When** the owner opens the dashboard, **Then**
   "clips this month" shows the real count (not `0`) and the latest-clip cell shows the most recent
   clip's owned descriptor (customer name, date), with **no** view/reach/engagement figure (FR-019).
2. **Given** a workspace with no clips, **When** the dashboard renders, **Then** the clip cells show the
   honest empty state (count `0`, no latest clip) — unchanged from T2.3, never a fabricated number.
3. **Given** the counts, **When** they render, **Then** they are computed from the workspace's
   `derived_asset` data (workspace-scoped), and a clip whose proof's consent is revoked is **excluded**
   (withdrawn — US3).

---

### User Story 2 - A proof's generated clips appear on its detail (Priority: P1)

From a proof's detail, the owner sees the clips generated from that proof ("Generated assets") — lit up
from real data — instead of the hidden/empty placeholder T2.3 left.

**Why this priority**: Closes the detail's `// T2.4` marker; the proof detail is where the owner acts on
proof, so seeing what's been made from it belongs there. Ships with Story 1 as the second read surface.

**Independent Test**: Open the detail of a proof that has seeded clips; confirm its generated clips are
listed (from data); open a proof with none; confirm the section is honestly empty/absent.

**Acceptance Scenarios**:

1. **Given** a proof with seeded, non-withdrawn clips, **When** the owner opens its detail, **Then** the
   proof's generated clips are shown from real data (owned descriptors only — no fabricated counts or
   metrics).
2. **Given** a proof with no clips (or only withdrawn ones), **When** its detail renders, **Then** the
   generated-assets section is honestly empty/absent (no fabricated "· N").
3. **Given** the detail, **When** it shows generated clips, **Then** the canonical ProofCard and the
   T2.3 detail layout are not broken, and no un-owned metric appears.

---

### User Story 3 - Consent governs derived assets; revocation withdraws them (Priority: P1)

A clip is bound to the consent that authorised it. When the governing proof's consent is **revoked**, the
clip is **withdrawn** — it stops being counted and shown — so no clip outlives its consent (P-VII).

**Why this priority**: This is the reason the slice ships on its own. The consent→derived-asset cascade
is constitution-critical machinery; getting it correct and demonstrable is the whole point of isolating
the schema slice. P1 alongside the read surfaces.

**Independent Test**: With a seeded clip made under a proof whose consent is currently **revoked** (a
granted→revoked lineage) and clips under currently-**granted** proofs, confirm the revoked proof's clip
is absent from the dashboard count and from that proof's detail, while the granted proofs' clips show —
all from static seed data, no code edit.

**Acceptance Scenarios**:

1. **Given** a clip whose source proof's **effective consent is granted**, **When** the reads run,
   **Then** the clip is counted and shown (active).
2. **Given** a clip whose source proof's **effective consent is now revoked** (made earlier under a
   then-granted consent), **When** the reads run, **Then** the clip is **withdrawn** — excluded from the
   dashboard count/latest and from the proof's generated assets — with no clip ever surfacing for
   non-granted proof (P-VII).
3. **Given** the schema, **When** a proof (and its consent lineage) is hard-deleted, **Then** its derived
   assets are removed too (referential integrity) — no orphaned clips.
4. **Given** the cascade, **When** it is exercised, **Then** the audit trail is preserved as the slice
   intends (the asset record is not silently destroyed by a revocation — see Q2), consistent with the
   append-only, auditable consent model and the render spec's two-tier revocation (§7.2).

---

### User Story 4 - Honest, owned-data counts only (Priority: P2)

Every clip count and descriptor the layer exposes is computed from data Weavova owns end-to-end; nothing
is fabricated, and no social/platform metric is introduced.

**Why this priority**: The carry-over data-honesty rule (FR-019). Secondary to the cascade and the read
surfaces, but binding on everything they show.

**Independent Test**: Change the seed (add/remove a clip, revoke a proof's consent) and observe the
dashboard count, latest clip, and detail generated-assets change accordingly — with no view/reach/
engagement metric anywhere.

**Acceptance Scenarios**:

1. **Given** the reads, **When** they compute counts/descriptors, **Then** every value is derived from
   `derived_asset` (+ owned joins to proof/consent), with **0** fabricated or un-owned metrics.
2. **Given** the latest-clip descriptor, **When** it renders, **Then** it carries only owned fields
   (customer, verified, created date) and **no** view/engagement count (consistent with the T2.1
   `LatestClipDescriptor`).

---

### Edge Cases

- **Revocation ≠ deletion**: T0.3 models revocation as a **new `revoked` consent version**, never a row
  delete. So withdrawal cannot rely on a row being deleted; it follows the **effective** consent of the
  proof (Q2). The seed exercises exactly this (a granted→revoked lineage).
- **Clip under a now-revoked proof**: born legitimately under a then-granted consent, now withdrawn by
  the later revocation — present in the table (audit), absent from every read.
- **Workspace with no clips**: honest empty (count `0`, no latest, empty generated-assets) — unchanged.
- **Cross-workspace isolation**: the reads are workspace-scoped; one workspace never counts or shows
  another's clips (carry-over of the tenant-isolation rule).
- **Hard delete of a proof**: its derived assets are removed (referential integrity), no orphans.
- **Migration on an existing DB**: applying the new-table migration must not alter or break the existing
  T0.3 tables/data (additive only).
- **Seeded relative dates**: clip `createdAt` uses the A-10 relative-date convention so "this month"
  stays populated across reseeds.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The schema MUST add a **`derived_asset`** table — a generated asset (a clip) — linked to
  its **source proof** and to the **consent it was made under**, matching the FK + cascade shape T0.3
  documented. This is the first schema change since T0.3 and MUST be **additive** (it MUST NOT alter or
  break the existing `workspace` / `source` / `proof` / `consent` tables or their data).
- **FR-002 (Q2→A)**: `derived_asset` MUST reference the **consent** it was made under via a
  **`consentId` FK → consent.id**, establishing the consent→derived-asset link as a first-class
  relationship (P-VII). The FK is kept for **provenance + hard-delete integrity only** (`ON DELETE
  CASCADE` for true hard deletes); it does **NOT** express revocation (revocation is a new `revoked`
  version, never a delete, so the FK cascade never fires on it). **Revocation-withdrawal is enforced at
  READ time** via the proof's **effective** consent (FR-009): a clip whose proof's effective consent is
  not "granted" is withdrawn from every read. The asset row is **retained** (audit trail), consistent
  with the append-only consent model and the render spec §7.2 "pull, don't destroy".
- **FR-003 (Q1→B)**: `derived_asset` MUST carry exactly this **owned** column set: **`id`**,
  **`workspaceId`** (scoping), **`proofId` FK → proof.id**, **`consentId` FK → consent.id**, **`kind`**
  (the asset kind, e.g. clip), **`format`** (the chosen aspect), **`assetUrl`** (the stored sample-clip
  reference), the **brand-authored `hook`** the merchant configured (owned provenance of the config),
  and **`createdAt`**. It MUST NOT carry the **T8 pipeline fields** (transcript/captions, highlight,
  reframe, music licensing, approval/distribution state) — those are resolved upstream and deferred to
  T8 (render spec §4–5). All reads are workspace-scoped via `workspaceId`.
- **FR-004**: A **Drizzle migration** for the new table MUST be generated and **committed**, and MUST be
  applicable via the **established neon-http migrator** used at T0.3 — no new migration tooling or
  dependency.
- **FR-005**: The slice MUST **seed honest `derived_asset` fixtures**: a few clips of **already-consented
  proofs**, each pointing at the **stubbed sample clip** in object storage, with **relative dates** (the
  A-10 convention) so "this month" / latest stay populated across reseeds. No clip may be seeded for a
  proof that was never granted consent (that would be a clip that could never legitimately exist).
- **FR-006 (Q3→A)**: The seed MUST include **cascade coverage** by **reusing the existing
  granted→revoked proof** (Leo M.): a clip made during its **granted window** (under the v1 consent),
  whose effective consent is now **revoked** — born legitimately but now **withdrawn** — alongside clips
  under currently-**granted** proofs that remain active. The cascade is thus observable in **static**
  seed data (US3). Absent a test runner, "tested" means the seed encodes this case and the reads
  demonstrably withdraw it, verified via `typecheck`/`lint`/`build`, a migration-applies check, and
  observing the dashboard/detail (a documented quickstart step).
- **FR-007**: The slice MUST add **workspace-scoped, `withDbRetry`-wrapped** query-layer reads for: the
  **clip count for "this month"**, the **latest clip** descriptor (owned fields only — customer, verified,
  created date; **no** view/engagement metric), and a **proof's generated assets** — all honouring the
  consent gate so **withdrawn** clips are excluded.
- **FR-008**: The slice MUST **swap the deferred `// T2.4` markers to real data**: the dashboard
  **"clips this month"** + **latest-clip** cells now read `derived_asset` (replacing the honest `0` /
  `null`), and the proof detail's **"Generated assets"** now reads `derived_asset` (replacing the
  hidden/empty placeholder T2.3 left) — **lighting up only when real, non-withdrawn data exists** (the
  honest-empty path is preserved for zero-clip workspaces/proofs).
- **FR-009 (P-VII cascade)**: The reads MUST enforce that a clip whose source proof's **effective
  consent is not "granted"** is **withdrawn** — excluded from the count, the latest-clip, and the proof's
  generated assets — so **no clip ever surfaces for non-consented proof**, and no clip outlives its
  consent. Referential integrity MUST also hold on hard delete (a deleted proof/consent removes its
  derived assets — no orphans).
- **FR-010 (FR-019 honesty)**: All exposed counts/descriptors MUST be computed from **owned** data
  (`derived_asset` + owned joins) — **0** fabricated values and **0** social/platform metrics
  (views/reach/engagement). The latest-clip descriptor carries only owned fields.
- **FR-011**: The reads MUST be **workspace-scoped** (one workspace never counts/shows another's clips)
  and MUST reuse the T2.1 `withDbRetry` so a transient cold start is retried transparently — consistent
  with the dashboard/detail reads they extend.
- **FR-012**: The slice MUST NOT build the **clip studio UI / generate flow** (T2.4b), the **real render
  engine** (T8), transcription, publishing/distribution, or the batch studio. It MUST NOT introduce a
  **new dependency**, MUST keep the **canonical ProofCard byte-unchanged**, and MUST keep the
  **auth/session seam** unchanged.
- **FR-013**: The migration + seed MUST keep the build/CI green (the lazy DB client → build without
  `DATABASE_URL`), and the seed MUST remain **re-runnable** (idempotent reset), consistent with the T0.3
  seed.

### Key Entities *(include if feature involves data)*

- **Derived asset (NEW — a clip)**: a generated asset produced from a proof. Linked to its **source
  proof** and the **consent it was made under** (`consentId`), workspace-scoped, pointing at the stored
  (stubbed) clip, with a format and a created date. Subject to the **revocation cascade** (P-VII). The
  exact columns are Q1; the cascade behaviour is Q2. (Documented at T0.3; created here.)
- **Consent**: versioned, revocable; **effective** state (latest version) governs whether a derived asset
  is active or **withdrawn**. Revocation is a new `revoked` version (append-only, auditable), **not** a
  delete — so withdrawal follows effective consent, not row deletion. (Existing, T0.3.)
- **Proof**: the source of a derived asset; carries the customer/verified fields the latest-clip
  descriptor and generated-assets list show via owned joins. (Existing, T0.3.)
- **Workspace**: the scope; every clip read is workspace-scoped. (Existing, T0.3.)
- **Sample clip (stub, in object storage)**: the pre-made clip the seeded assets point at — an honest
  stand-in for a real render (the real per-proof render is T8). (Stub reference.)
- **NOT modelled here (deferred to T8)**: the full `RenderInput` (transcript/captions, highlight,
  reframe, music licensing), approval state, and distribution/publish state. Not added speculatively
  (render spec §4–5; FR-003/Q1).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After this slice, the dashboard's "clips this month" and latest-clip cells show **real**
  values from seeded data when clips exist (no longer the hardcoded `0`/empty), and the honest-empty path
  remains for zero-clip workspaces — verifiable by reseeding/observing with no code edit.
- **SC-002**: A proof with seeded non-withdrawn clips shows them on its detail's generated assets; a proof
  with none shows the honest-empty/absent section — verifiable by observation.
- **SC-003**: **0** clips surface for any proof whose effective consent is not "granted": the seeded
  granted→revoked proof's clip is **absent** from the dashboard count, the latest-clip, and that proof's
  detail, while currently-granted proofs' clips are present — from static seed data (P-VII / SC of the
  cascade).
- **SC-004**: Changing a fixture (add/remove a clip, or revoke a proof's consent) changes the dashboard
  count, latest clip, and detail generated-assets accordingly — with **0** fabricated or un-owned metrics
  anywhere (FR-019).
- **SC-005**: The migration applies cleanly on top of the existing T0.3 schema with **0** changes to the
  existing tables' data, and the seed is re-runnable; the build is green (incl. without `DATABASE_URL`).
- **SC-006**: Referential integrity holds: hard-deleting a proof removes its derived assets (no orphans),
  and no derived asset references a non-existent proof/consent.
- **SC-007**: **No new dependency** is added; the canonical ProofCard and the auth/session seam are
  unchanged.

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: N/A to new chrome — this is the data layer; the read surfaces it
  lights (dashboard clip cells, detail generated assets) keep the customer/proof primary and the counts
  quiet. No clip is shown that misrepresents the customer.
- **Locked stack (P-III)**: Neon + Drizzle + the established neon-http migrator; R2 reference for the
  sample clip. **No new dependency.** Heavy render stays off Vercel (the asset points at a stubbed
  sample; the real engine is T8).
- **Pressroom tokens (P-IV)**: N/A for the schema/seed; the read surfaces reuse existing on-token
  dashboard/detail components.
- **Port, don't redesign (P-V)**: No new screen designed; the existing dashboard/detail read surfaces
  light up. The `derived_asset` shape is **ported from the T0.3-documented design** and the render
  contract (§4), not reinvented.
- **Fixtures-first (P-VI)**: The defining principle of this slice — the **schema is written before the
  screen that writes it** (the studio T2.4b). The fixture/`derived_asset` shape is the schema contract;
  the dashboard/detail read it over seeded fixtures; the real generate (T2.4b) and render (T8) swap in
  behind the same reads.
- **Consent enforcement (P-VII)**: The heart of the slice. `derived_asset.consentId` makes the
  consent→asset link first-class; the revocation cascade **withdraws** assets when the governing consent
  is no longer granted; no clip outlives its consent; no clip exists for non-granted proof. This is where
  the cascade modelled at T0.3 first does real, observable work.
- **No editor (P-VIII)**: N/A — no studio/editor in this slice.
- **Scope (P-IX, P-XI)**: One foundation slice — the table, migration, seed, reads, and the marker swaps.
  The studio UI, generate flow, real render, publishing, and batch are out of scope. No speculative
  columns (only what the stub + reads + cascade need; T8 fields deferred — Q1).
- **Microcopy (P-XI)**: Any copy on the lit-up read surfaces is honest about counts; avoids
  "amazing"/"awesome" and emoji.

## Assumptions

- **A-01 (T0.3 documented the shape)**: T0.3 deliberately documented `derived_asset.consentId →
  consent.id` + the revocation cascade and left the table uncreated ("built at T2"). This slice builds
  exactly that, so the prior screens' `// T2.4` markers light up.
- **A-02 (assets point at the stubbed sample clip)**: With no real render engine, every seeded asset
  references the **pre-made sample clip** in R2 (CLAUDE.md §3 — stubbed render). The asset's stored
  reference is honest (a sample stand-in); per-proof real renders are T8.
- **A-03 (revocation is a new version, not a delete)**: Per T0.3, revocation = a new `revoked` consent
  version; effective consent = the latest version. So **withdrawal follows effective consent**, which is
  why a plain `ON DELETE CASCADE` alone cannot express revocation-withdrawal (Q2). Hard-delete cascade is
  for referential integrity only.
- **A-04 (relative seed dates — A-10 convention)**: Clip `createdAt` uses dates relative to seed-time now
  (as the proof/consent fixtures do) so "this month"/latest stay alive across reseeds.
- **A-05 (reuse the existing reads + reliability)**: The clip reads extend `getDashboardSummary` and the
  proof-detail read, reuse `withDbRetry`, and stay workspace-scoped — no new patterns.
- **A-06 (minimal owned columns now)**: The table carries only what the stub + reads + cascade need
  (provenance + sample reference + format + dates + consent/proof/workspace links); the full
  `RenderInput` (captions/highlight/reframe/music/approval/distribution) is **T8** (render spec §4–5),
  not added now (Q1).
- **A-07 (cascade verified via the seed, no test runner)**: As in T0.3/T2.x there is no unit-test runner;
  "tested" means the **seed encodes a cascade case** (a granted→revoked lineage with a clip) and the
  reads demonstrably withdraw it, verified via `typecheck`/`lint`/`build`, a migration-applies check, and
  observing the dashboard/detail (Q3).
- **A-08 (T2.4b depends on this)**: The parked studio slice (T2.4b) writes into this table on Generate
  and re-checks consent; its plan is unblocked only after this slice ships. The render engine (T8) later
  replaces the sample reference with real renders behind the same shape.
- **A-09 (DEPENDENCY — render contract shape)**: `docs/Weavova-Render-Proof-Spec.md` §4 (`RenderInput`)
  and §7.2 (two-tier revocation) inform the column set (Q1) and the cascade semantics (Q2); the parts
  resolved upstream by the T7/T8 pipeline are not stored here yet.

## Clarifications

> Three schema/cascade ambiguities were surfaced (Principle XII + P-VII, this being a constitution-
> critical foundation change). **All three are now RESOLVED** (human decisions, 2026-06-16) and folded
> into the requirements/assumptions above. **Q2** (the read-time withdrawal) is the P-VII-critical
> decision the plan must hold carefully.

### Question 1 — RESOLVED (B): the `derived_asset` columns

**Resolution** (human decision, 2026-06-16): **Option B.** `derived_asset` carries `id`, `workspaceId`,
`proofId` (FK), `consentId` (FK), `kind`, `format`, `assetUrl` (the stored sample-clip reference),
`createdAt`, **and the owned brand-authored `hook`** the merchant configured (config provenance). It does
**not** carry the T8 pipeline fields (transcript/captions, highlight, reframe, music licensing,
approval/distribution). Captured in **FR-003**.

### Question 2 — RESOLVED (A): revocation is read-time withdrawal via effective consent

**Resolution** (human decision, 2026-06-16): **Option A.** Revocation-withdrawal is enforced at **READ
time** by the proof's **effective** consent — every `derived_asset` read excludes assets whose proof's
effective consent is not "granted". The `consentId` FK is kept for **provenance + hard-delete integrity
only** (`ON DELETE CASCADE` for true hard deletes; it **never** fires on revocation, since revocation is
a new `revoked` version, not a delete). Asset rows are **retained** for audit (append-only, "pull don't
destroy" — render spec §7.2). A stored `status` flag (option B) is deferred until the revocation
*operation* exists (T7+). Captured in **FR-002**, **FR-009**, and **A-03**.

### Question 3 — RESOLVED (A): reuse Leo M.'s granted→revoked lineage in the seed

**Resolution** (human decision, 2026-06-16): **Option A.** The seed reuses the existing granted→revoked
proof (Leo M.) to encode a **born-then-withdrawn** clip — made during his granted window (under the v1
consent), now withdrawn because his effective consent is revoked — alongside **active** clips under
currently-granted proofs. The cascade is observable in **static** seed data; verified by observation +
the standard build/migration-applies checks (a documented quickstart step). An automated cascade
assertion (option C) is a possible later add. Captured in **FR-006** and **A-07**.
