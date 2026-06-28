---
description: "Task list for T7.1 — Scoped consent model: a SCHEMA + read-helper evolution (NO new UI). Adds a ConsentDisplay payload (useScope[]/nameDisplay/showFace) to each consent version + a workspace display-default, behind the SAME seam every consent consumer already routes through. P-VII mechanism unchanged; least-privilege default; one-directional privacy override; fails-closed scope gate (the T9 forward-contract); honest full-scope backfill. Existing FR-010 consumers byte-stable BY CONSTRUCTION (they gate on state='granted' only, never read scope)."
---

# Tasks: T7.1 — Scoped consent model (the ConsentDisplay payload + read path)

**Input**: Design documents from `specs/T7.1-scoped-consent-model/`
**Prerequisites**: plan.md, spec.md (US1–US4), research.md (R1 storage crux · R2 GIN/Drizzle · R3
nullability · R4 builtin fallback · R5 backfill idempotency · R6 privacy ordering · R7 return widening),
data-model.md (2 enums, 5 cols, 1 GIN index, resolution rules), contracts/consent-model.md (exact
signatures), quickstart.md (reseed + read-path checks).
**Constitution**: build against `.specify/memory/constitution.md` (v1.4.0).
**Prerequisite slices** (all shipped): T2.4a (the `consent` version model + `effectiveConsentState`/
`effectiveConsentGranted` + `derived_asset.consentId` provenance), T2.3 (`getProof` +
`latestConsentState`/`latestConsentVersion`/`latestConsentEffectiveAt`), T2.4b (`getGrantedConsentId` +
the single-attempt insert), T5-Consent (`getConsentLedger`/`getConsentHistory`/`getProofConsentClips` +
`recordConsentWithdrawal`), T6 (the `workspace` row + membership). **No new dependency.**
**Tests**: NOT requested (no test runner installed; none added — P-III). Verification via
`npm run typecheck`/`lint`/`build` green + the `quickstart.md` reseed + read-path checks. No test tasks.

> **GENERATION-ONLY GUARD.** This file is the task list only. Nothing here has been implemented,
> migrated, seeded, or run. Execution happens in `/speckit.implement` AFTER human approval. At
> implementation, leave EVERYTHING uncommitted — no per-task commits, no branch, no push/merge. Cornel
> reviews and commits manually (mirrors prior slices).

> **⛔ RATIFIED DECISIONS (research.md — do NOT re-open):** typed columns throughout (NO jsonb for
> ConsentDisplay; `captureContext` untouched) · `use_scope consent_scope[]` **NOT NULL DEFAULT '{}'**
> (fail-closed empty baseline) + GIN index · `name_display`/`show_face` **nullable** + fallback constant
> `{first_initial, true}` · workspace display-default on the **`workspace` row** (Q1=A; `brand_kit`
> rejected) · scope gate **fails closed** (`…) is true`) · one-directional privacy via **`resolveDisplay`**
> · backfill = **honest prior full-trust behaviour** (P-XIV) · least-privilege `['organic']` default for
> **new** captures only.

> **THE BYTE-STABILITY CONSTRUCTION (binding):** every existing consent consumer gates on
> `effectiveConsentGranted` = `state = 'granted'` **only** — it never reads scope/display. The new
> columns are therefore **invisible** to them; they stay byte-stable WITHOUT edits. The scope gate is
> **net-new** (consumed only by T9). **If any FR-010 consumer turns out to require an edit to keep
> working, STOP and surface it as a P-V violation — do not silently edit a consumer.**

> **NON-UI SLICE.** Unlike a ported-screen slice, these user stories share the data layer
> (`schema.ts` / `queries.ts` / `consent.ts` / `seed.ts`) and are **layered**, not independently
> deployable: Foundation (schema+migration) → read path (US1) → invariants (US2) → scope gate (US3) →
> regression proof (US4). They are independently **verifiable** via the quickstart checks, not
> independently shippable. P-II/P-IV/P-V-layout/P-VIII/P-XIII/P-XV/P-XVI are **N/A** (no surface, no
> render, no controls); the live gates are **P-VII** (Leo M.), **P-XIV** (honest backfill), **P-V seam**
> (byte-stable consumers).

---

## Phase 1: Setup (baseline)

**Purpose**: confirm a green starting point so every later step's "still green" is meaningful.

- [x] T001 Capture the pre-change baseline: run `npm run typecheck && npm run lint && npm run build` and
      confirm green; note that **no new dependency** is added by this slice (`pgEnum`/`.array()`/GIN are
      in-stack). **DoD**: all three commands green on an unmodified tree; no `package.json` change planned.

---

## Phase 2: Foundational (schema + migration + backfill) — BLOCKS all user stories

**Purpose**: the additive schema, the `0005` migration, and the idempotent backfill. Everything else
reads these. **⚠️ No user-story task may begin until Phase 2 is complete and applied.**

- [x] T002 Add the schema additions to `src/db/schema.ts`: `consentScopeEnum`
      (`consent_scope`: organic|paid|showcase|embed) and `nameDisplayEnum`
      (`name_display`: full|first_initial|anonymous); on `consent` add
      `useScope: consentScopeEnum("use_scope").array().notNull().default([])`,
      `nameDisplay: nameDisplayEnum("name_display")` (nullable),
      `showFace: boolean("show_face")` (nullable), and a GIN index
      `index("consent_use_scope_gin").using("gin", t.useScope)`; on `workspace` add
      `defaultNameDisplay: nameDisplayEnum("default_name_display")` (nullable) and
      `defaultShowFace: boolean("default_show_face")` (nullable). **Existing columns/indexes/enums
      UNCHANGED; `captureContext` jsonb untouched.** **DoD**: `npm run typecheck` green; diff is purely
      additive (no existing line changed). **Constitution**: P-VII (mechanism untouched — only payload
      columns added).
- [x] T003 [P] Add the client-safe types to `src/lib/consent.ts`: `ConsentScope` and `NameDisplay`
      type-unions derived from the new enums (the erased `type-only` import idiom already used for
      `ConsentState`/`ClipFormat`), and the `ConsentDisplay` interface
      `{ useScope: ConsentScope[]; nameDisplay: NameDisplay; showFace: boolean }`. **DoD**: `typecheck`
      green; no DB/runtime code imported into the client-safe module. (Different file from T004 → [P].)
- [x] T004 [P] Generate migration `0005` with `npm run db:generate`; inspect `drizzle/0005_*.sql` and
      confirm it contains EXACTLY the additive DDL — 2 `CREATE TYPE`, 5 `ADD COLUMN`
      (`consent.use_scope`/`name_display`/`show_face`, `workspace.default_name_display`/`default_show_face`),
      1 GIN `CREATE INDEX` — and touches **no existing table/column**. **DoD**: generated SQL reviewed and
      is purely additive; no `DROP`/`ALTER … TYPE`/data loss. (Depends on T002; different artifact from
      T003 → [P].)
- [x] T005 Hand-append the **idempotent, guarded** backfill to `drizzle/0005_*.sql` (raw SQL inside a
      migration is permitted — Constitution X): `UPDATE consent SET use_scope =
      '{organic,paid,showcase,embed}' WHERE state = 'granted' AND use_scope = '{}';` and `UPDATE consent
      SET name_display = 'full', show_face = true WHERE name_display IS NULL;`. Apply with
      `npm run db:migrate`; then run `db:migrate` a second time and confirm the backfill is a **no-op**
      (guards make it re-runnable on the shared Neon DB). **DoD**: migration applies clean; re-apply
      changes 0 rows; existing granted rows now full-scope, display `full`/`true`; non-granted rows keep
      `use_scope = '{}'`. **Constitution**: P-XIV (restores the full-trust behaviour the fixtures already
      had — honest, not invented); P-VII (revoked rows stay non-granted, gain no scope).

**Checkpoint**: schema + migration applied; build still green (no consumer reads the new columns yet).

---

## Phase 3: User Story 1 — The payload is carried through the read path (Priority: P1)

**Goal**: the shared read helpers carry the effective version's scope + display to any consumer that
asks, with the existing read-time-effective state resolution byte-unchanged.

**Independent Test (quickstart §4a/§4b setup)**: read a granted proof's effective consent and confirm
`useScope`/`nameDisplay`/`showFace` come back alongside state/version/date; confirm existing helpers'
generated SQL is unchanged.

- [x] T006 [US1] Add the latest-version sibling subselects in `src/db/queries.ts` —
      `latestConsentScope` (`consent_scope[] | null`), `latestConsentNameDisplay` (`name_display | null`),
      `latestConsentShowFace` (`boolean | null`) — each a correlated `select … from consent c where
      c.proof_id = ${proof.id} order by c.version desc limit 1`, mirroring `latestConsentVersion`
      verbatim. **Do NOT touch** `latestConsentState`/`latestConsentVersion`/`latestConsentEffectiveAt`
      or `effectiveConsentState`/`effectiveConsentGranted`. **DoD**: `typecheck` green; existing helpers
      byte-identical (git diff shows only additions). **Constitution**: P-V seam (additive siblings).
- [x] T007 [US1] Add `getEffectiveConsentDisplay(workspaceId, proofId): Promise<ConsentDisplay | null>`
      in `src/db/queries.ts` — returns the effective version's `{ useScope, nameDisplay, showFace }` with
      display resolved through the fallback chain (stored value → workspace default →
      `BUILTIN_DISPLAY_DEFAULT`), `null` when no consent row; workspace-scoped via the proof join;
      `withDbRetry`-wrapped. **It is NOT called by any existing surface in this slice** (forward entry
      point for T7.2 / verified bar). **DoD**: `typecheck` green; returns correct payload for a granted
      fixture and `null` for a proof with no consent row (quickstart §4a). **Constitution**: P-XIV (only
      owned consent data).
- [x] T008 [US1] Widen `getGrantedConsentId` in `src/db/queries.ts` additively: return
      `{ consentId, useScope, nameDisplay, showFace } | null` (the granted effective version's payload),
      selecting the new columns alongside `consent.id`. **DoD**: `typecheck` green; the existing callers
      that read only `.consentId` — the `generateClip`/`generateBatch` gate and `recordConsentWithdrawal`
      — compile and behave **unchanged** (verify by reading those call sites; no edit needed). If a caller
      requires an edit beyond reading `.consentId`, STOP (unexpected coupling). **Constitution**: P-VII
      (the generate gate semantics unchanged — still re-checks granted).

**Checkpoint**: the read path carries scope + display; existing consumers untouched; build green.

---

## Phase 4: User Story 2 — Least-privilege default + one-directional privacy override (Priority: P1)

**Goal**: encode the two invariants in pure logic — new consent defaults to `organic` only; a customer
override can move only toward MORE privacy. This is the sole sanctioned display-resolution path.

**Independent Test (quickstart §4c)**: `resolveDisplay` honors a more-private override, clamps a
less-private one to the workspace default, returns the default when override is absent/equal, and falls
back to `BUILTIN_DISPLAY_DEFAULT` when the workspace default is null. `DEFAULT_USE_SCOPE` is `['organic']`.

- [x] T009 [P] [US2] Add the pure logic to `src/lib/consent.ts`: `DEFAULT_USE_SCOPE: ConsentScope[] =
      ['organic']`; `BUILTIN_DISPLAY_DEFAULT = { nameDisplay: 'first_initial', showFace: true }`; the
      privacy ordering (`nameDisplay`: full<first_initial<anonymous; `showFace`: true<false); and
      `resolveDisplay(wsDefault, override?)` returning, per field, the **more-private** of (default,
      override) — less-private override clamped to the default, absent/equal → default. No DB import
      (client-safe). **DoD**: `typecheck` green; the quickstart §4c assertions all hold (more-private
      honored, less-private clamped, absent→default, null-default→builtin). (Different file from the
      `queries.ts` phases → [P] with T006–T008/T011–T012.) **Constitution**: P-VII deepened (consent is
      sacred — the model can never record a customer as less private than they chose).
- [x] T010 [US2] In `src/lib/consent.ts`, add a binding doc-comment on `resolveDisplay` declaring it the
      **SOLE sanctioned write path for display resolution**: the T7.2 capture write AND the seed MUST
      route every workspace-default-plus-override through it; **no side-door write may set a stored
      display value that is less private than the workspace default**. Cross-reference it from
      `DEFAULT_USE_SCOPE` (the matching least-privilege rule for scope). **DoD**: the comment is present
      and unambiguous; it names T7.2 + seed as the callers that must comply. (This is a guard-rail note,
      enforced by the T015 grep check, not a runtime mechanism.) **Constitution**: P-VII.

**Checkpoint**: the invariants exist as pure, verifiable logic; nothing writes display yet except the
seed (next phase), which must route through T009/T010.

---

## Phase 5: User Story 3 — The fails-closed scope gate (the T9 forward-contract) (Priority: P2)

**Goal**: expose a clean "is use X permitted for this proof's effective consent?" — a SQL predicate
(for filtering) and an async boolean (for imperative checks) — that fails closed on every non-granted
state. T7.1 builds the model + the gate; enforcement surfaces are T9.

**Independent Test (quickstart §4b)**: full-scope proof permits every scope; an organic-only proof
denies `paid`; awaiting/revoked/missing deny ALL; the SQL form filters clips via the GIN index, not a
JSON scan.

- [x] T011 [US3] Add `effectiveConsentGrantsScope(proofIdColumn, scope): SQL` in `src/db/queries.ts` —
      `( select c.state = 'granted' and c.use_scope @> array[${scope}]::consent_scope[] from consent c
      where c.proof_id = ${proofIdColumn} order by c.version desc limit 1 ) is true` — built on the same
      latest-version subselect as `effectiveConsentGranted`; the trailing `is true` coerces "no row"
      (NULL) → `false` (**fail-closed**). **DoD**: `typecheck` green; on fixtures, a `SELECT` over
      `derived_asset⋈proof` filtered by this predicate for `'paid'` returns only full-scope clips; an
      `EXPLAIN` shows the `consent_use_scope_gin` index serving the containment (no per-row JSON parse).
      **Constitution**: P-VII (fails closed — never widens permission).
- [x] T012 [US3] Add `consentGrantsScope(workspaceId, proofId, scope): Promise<boolean>` in
      `src/db/queries.ts` — workspace-scoped via the proof join, `withDbRetry`-wrapped; returns `false`
      for missing/cross-workspace/non-granted/scope-absent, `true` only when the effective granted
      version's `use_scope` contains the scope. **DoD**: `typecheck` green; quickstart §4b cases all hold
      (full-scope→true per scope; organic-only→paid false/organic true; awaiting & no-row→all false).
      **Constitution**: P-VII.

**Checkpoint**: the scope gate exists and fails closed; no current surface consumes it (T9 will).

---

## Phase 6: Seed / backfill reconciliation (idempotent fixtures)

**Purpose**: make the demo data coherent under the richer payload, routing display through the sanctioned
path. Depends on T009/T010 (resolveDisplay) and the applied migration.

- [x] T013 Update `src/db/seed.ts`: write `useScope`/`nameDisplay`/`showFace` inline on each `consent`
      insert — granted versions → `['organic','paid','showcase','embed']`, `nameDisplay:'full'`,
      `showFace:true`; awaiting/revoked versions → `useScope: []` (grants nothing). Set the Lumen
      `workspace` row's `defaultNameDisplay:'first_initial'`, `defaultShowFace:true` (the privacy-forward
      default NEW captures inherit — intentionally distinct from existing rows' `full` backfill). Any
      display value the seed sets must be obtained via `resolveDisplay`/the constants from T009 (no
      hand-set less-private literal). The seed already wipes + re-inserts, so it stays idempotent.
      **DoD**: `npm run db:seed` runs clean and is re-runnable; granted fixtures full-scope, awaiting/
      revoked empty-scope; workspace defaults set; no seed write sets a display value less private than
      the workspace default. **Constitution**: P-XIV (honest full-trust restoration, not invented grants);
      P-VII (revoked Leo M. version gets no scope).

**Checkpoint**: fresh reseed produces coherent, honest fixtures; build green.

---

## Phase 7: User Story 4 — Regression proof (Leo M. P-VII + P-V byte-stability) (Priority: P1)

**Goal**: prove the richer payload disturbs nothing — the withdrawal mechanism and every existing
consumer behave identically. (Verification only; ties to quickstart §4a/§4d.)

**Independent Test**: reseed; Leo M. resolves withdrawn and his clip is withheld; all FR-010 surfaces
render identically; build green.

- [x] T014 [P] [US4] **Leo M. P-VII verification** (quickstart §4a): after reseed, confirm Leo M.'s
      effective consent is still **revoked** under the richer payload — `getEffectiveConsentDisplay`
      reflects the revoked effective version; `consentGrantsScope(ws, leo, <any>)` → **false** for every
      scope; his clip is still **withheld** from Library / showcase / export (unchanged consumers); his
      `getConsentHistory` still shows the retained `v1 granted → v2 revoked` timeline. **DoD**: all hold;
      **0** behavioural change vs pre-`0005`. **Constitution**: P-VII (withdrawal still effective,
      retained, read-time).
- [x] T015 [P] [US4] **`resolveDisplay` sole-path + invariant verification** (quickstart §4c): assert the
      privacy clamp cases inline (more-private honored, less-private clamped, absent/equal→default,
      null-default→builtin) AND grep `src/db/seed.ts` (and confirm no other current writer) to verify no
      side-door sets a stored display less private than the workspace default — every display write routes
      through `resolveDisplay`/the constants. **DoD**: assertions hold; grep finds no non-sanctioned
      less-private display write. **Constitution**: P-VII.
- [x] T016 [P] [US4] **Scope-gate verification** (quickstart §4b): confirm permit/deny for full-scope,
      organic-only, awaiting, and no-row proofs, and that the SQL predicate filters via the GIN index
      (`EXPLAIN`), not a JSON scan. **DoD**: all cases correct; fail-closed on every non-granted state.
- [x] T017 [US4] **P-V byte-stability audit across the REAL queries** (quickstart §4d): for EACH FR-010
      consumer — inbox/`ProofCard` (`getProofs`), Library (`getLibraryClips`), dashboard
      (`getDashboardSummary`), export (`getClipExport`/`getClipExports`), warmth (`src/lib/warmth.ts`),
      showcase (`getShowcase`), clip-detail (`getClip`), proof-detail (`getProof`), the T5 ledger
      (`getConsentLedger`/`getConsentHistory`/`getProofConsentClips`), and the generate gates
      (`generateClip`/`generateBatch` via `getGrantedConsentId`) — read the actual code and confirm: (a)
      it gates on `effectiveConsentGranted` (state-only) or the byte-unchanged `latestConsent*` helpers;
      (b) it selects **explicit columns** (no `SELECT *` / no struct drift pulling in the new columns);
      (c) it does **not** read `use_scope`/`name_display`/`show_face`; (d) no consumer or seed path is
      **newly required** to populate `use_scope` to keep working (the `'{}'` default + backfill cover it).
      **If ANY consumer needs an edit to keep working, STOP and surface it as a P-V violation — do not
      silently edit it.** **DoD**: all consumers confirmed byte-stable by construction; render parity with
      pre-`0005` (dashboard counts, inbox states, Library/showcase/export contents, warmth order,
      clip/proof detail, T5 ledger). **Constitution**: P-V (seam preserved).

**Checkpoint**: the model is proven additive and honest; the demo is unchanged except for new latent data.

---

## Phase 8: Polish & Definition of Done

- [x] T018 [P] Owned-data audit (P-XIV): confirm every value the model carries is real owned consent
      data — backfilled scopes restore prior full-trust behaviour, **0** fabricated scope/display/count;
      enum domains keep "unknown scope" unrepresentable (FR-012). **DoD**: audit note recorded; no
      invented data. **Constitution**: P-XIV.
- [x] T019 Code cleanup (TS strict: no `any`, no unjustified `@ts-ignore`); confirm the new helpers
      follow the file's existing comment/idiom density (mirror `latestConsentVersion` / `effectiveConsentGranted`).
      **DoD**: lint clean; no stylistic drift.
- [x] T020 **Final DoD**: run `npm run typecheck && npm run lint && npm run build` (green) and execute
      the full `quickstart.md` (migrate idempotent · reseed coherent · §4a Leo M. unchanged · §4b scope
      gate correct + GIN-served + fail-closed · §4c resolver clamps · §4d consumers byte-stable). Then
      **STOP and report**; do not advance to T7.2 until Cornel says to proceed (P-IX). **DoD**: all green;
      quickstart fully passes.

> **Constitution N/A for this slice (stated for completeness):** P-II (no proof surface), P-IV (no
> styles), **P-V layout** (no ported screen — but the **P-V seam** IS gated, T017), P-VIII (no editor),
> P-XIII (no controls), P-XV / P-XVI (non-render). The empty/loading/error, responsive-breakpoint, and
> keyboard-accessibility DoD items are **N/A** — this slice ships no UI surface.

---

## Dependencies & Execution Order

### Phase order (build stays green at each step)

- **Phase 1 (Setup)** → **Phase 2 (Foundational: schema+migration+backfill)** BLOCKS everything →
  **Phase 3 (US1 read path)** + **Phase 4 (US2 pure logic)** + **Phase 5 (US3 scope gate)** →
  **Phase 6 (seed reconciliation)** → **Phase 7 (US4 regression proof)** → **Phase 8 (DoD)**.
- Rationale: additive schema + migration first (so runtime queries have the columns), then helpers (read
  path, gate) and pure logic, then the seed that uses them, then verification last.

### Concrete task dependencies

- T002 → T004 → T005 (schema → generate → apply+backfill). T003 [P] after T002 (different file).
- T006 → T007 → T008 (all `queries.ts`, same file — sequential). Require T005 applied.
- T009 → T010 (both `consent.ts`). Require T003 (types). [P] vs the `queries.ts` phases.
- T011 → T012 (both `queries.ts`). Require T005 applied; sequence after T006–T008 (same file).
- T013 (seed) requires T009/T010 (resolveDisplay) + T005 (migration).
- T014–T017 (verification) require T013 + all impl. T018–T020 last.

### Parallel opportunities ([P])

- **T003 ∥ T004** — types (`consent.ts`) vs migration generation (different artifacts), both after T002.
- **Phase 4 (T009) ∥ Phase 3 (T006–T008) ∥ Phase 5 (T011–T012)** — `consent.ts` is a different file from
  `queries.ts`; the pure logic can be built while the query helpers are written. (Within `queries.ts`,
  T006→T007→T008→T011→T012 are sequential — same file.)
- **T014 ∥ T015 ∥ T016 ∥ T018** — independent read-only verifications.

---

## Implementation Strategy

This is one coherent data-layer increment, not a stack of independently shippable UI stories. Land it in
order:

1. **Phase 1–2 (Foundation)** — schema, migration, backfill. **Build green; no behavioural change.**
2. **Phase 3–5** — read path, invariants, scope gate (US1/US2/US3). The model now carries + gates scope.
3. **Phase 6** — reconcile the seed (honest full-scope fixtures + workspace defaults).
4. **Phase 7–8** — prove P-VII (Leo M.) and P-V (byte-stable consumers), run the DoD, then **STOP and
   report**.

**MVP scope**: Phases 1–3 (Foundation + US1 read path) are the minimum that makes the payload real and
carried; US2 (invariants) and US3 (scope gate) complete the forward-contract the spec requires for T7.2
and T9. All four ship together in this slice.

---

## Notes

- [P] = different files, no incomplete-task dependency. `queries.ts` tasks are NOT [P] with each other.
- No test runner is added (P-III); "DoD" verification is `typecheck`/`lint`/`build` + quickstart checks.
- At `/speckit.implement`: leave everything uncommitted; no branch/commit/push — Cornel reviews + commits.
- The single hard guard: **if any FR-010 consumer needs an edit to keep working, STOP** — that would mean
  the by-construction byte-stability claim is false and is a P-V violation to surface, not patch silently.
