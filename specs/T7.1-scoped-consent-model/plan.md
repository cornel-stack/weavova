# Implementation Plan: Scoped consent model (the ConsentDisplay payload + read path)

**Branch**: `T7.1-scoped-consent-model` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T7.1-scoped-consent-model/spec.md`

**Resolved input (Q1 — settled)**: workspace display-default lives as **additive field(s) on the
`workspace` row** (Option A). `brand_kit` rejected (multi-row, no `workspaceId` uniqueness). No new
table; no presupposed T9 settings UI.

---

## Summary

Evolve the consent model from binary `granted/awaiting/revoked` into a record that also carries a
**`ConsentDisplay` payload** — **`useScope[]`** (`organic` · `paid` · `showcase` · `embed`),
**`nameDisplay`** (`full` · `first_initial` · `anonymous`), **`showFace`** (boolean) — on **each consent
version**, plus a **workspace-level display default**. This is a **schema + read-helper evolution with
no new UI**. The P-VII withdrawal mechanism is untouched (new `revoked` version, read-time effective,
retained); only the payload each version carries is richer.

**The crux decision (storage):** `useScope` lands as a **Postgres enum-array column** (`consent_scope[]`)
with a **GIN index**, so the downstream scope gate (T9) is a **single indexed containment predicate**
(`use_scope @> array['paid']`), never a per-row JSON scan. `nameDisplay` and `showFace` land as a
**typed enum column + boolean column** — small, presentation-only, no gate needed. **No `jsonb` is used
for any part of `ConsentDisplay`** (the existing `consent.captureContext` jsonb is left exactly as-is),
so there is no jsonb/typed split to justify: the queryable-gate criterion is met by typed columns
throughout.

**The forward contract:** a **fails-closed scope gate** — both a SQL predicate (for filtering "clips
whose consent grants scope X") and an async boolean (for imperative channel checks) — that T9 consumes
unchanged. A **one-directional privacy resolver** (pure function) is the single enforcement point for
"customer may only move toward more privacy"; T7.2's capture write will call it.

**Why the regression surface is automatically safe:** every existing consent consumer
(library/export/showcase/dashboard/warmth/clip-detail/inbox/proof-detail/T5 ledger/generate gates) gates
on `effectiveConsentGranted`, which checks **`state = 'granted'` only** — it never reads scope. Adding
scope/display columns therefore changes **nothing** they read; they stay byte-stable by construction.
The new scope gate is **net-new** and consumed only later (T9).

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 15 App Router, React 19 — unchanged (P-III).

**Primary Dependencies**: Neon Postgres + Drizzle ORM + drizzle-kit (migration `0005`). **No new
dependency** — `pgEnum` + `.array()` + GIN index are all in the locked Drizzle stack.

**Storage**: additive migration `0005` — two new `pgEnum`s (`consent_scope`, `name_display`); three new
columns on `consent` (`use_scope consent_scope[]`, `name_display name_display`, `show_face boolean`); two
new columns on `workspace` (`default_name_display name_display`, `default_show_face boolean`); one GIN
index on `consent.use_scope`. **Existing columns/indexes unchanged.** `consent.captureContext` jsonb is
untouched.

**Testing**: no test runner is installed and **none will be added** (P-III). Verification is by
`npm run typecheck` + `npm run lint` + `npm run build` (green), plus a **reseed + read-path verification**
(quickstart): confirm Leo M. resolves withdrawn, the scope gate permits/denies correctly, and the
resolver clamps toward privacy. Pure helpers (resolver, scope defaults) are verified by inline
assertions in the quickstart verify step, not a framework.

**Target Platform**: Vercel (Neon serverless). No heavy compute; this is data + query.

**Project Type**: Single Next.js app (`src/`).

**Performance Goals**: the scope gate is O(1) per proof via the same latest-version correlated subselect
the existing gate uses, with GIN-indexed containment — no JSON parsing, no N+1.

**Constraints**: byte-stable existing consumers; least-privilege default; one-directional privacy;
fails-closed gate; idempotent backfill safe on the shared prod DB.

**Scale/Scope**: model + read path only. No UI. ~15 demo proofs / ~5 clips in fixtures.

## Constitution Check

*GATE: re-checked after design below — still PASS.*

- [x] **Customer is the headline (P-II)**: N/A for layout (no UI). The payload exists precisely so later
      surfaces can present the customer exactly as they chose (more private, never less) — it serves P-II.
- [x] **Locked stack (P-III)**: Neon + Drizzle + drizzle-kit only; `pgEnum`/`.array()`/GIN index are
      in-stack. **No new dependency.** No test framework added.
- [x] **Pressroom tokens (P-IV)**: N/A — no UI/styles in this slice.
- [x] **Port, don't redesign (P-V)**: N/A for layout; the P-V discipline honored is the **seam** —
      changes live behind `effectiveConsentState` / `getGrantedConsentId` / the `latestConsent*`
      siblings; existing consumers are byte-stable.
- [x] **Fixtures-first (P-VI)**: the fixture shape **is** the contract — the seeded `ConsentDisplay`
      shape is exactly what real captured consent (T7.2) will write; built/verified on fixtures.
- [x] **Consent enforcement (P-VII)**: mechanism **unchanged** (new `revoked` version, read-time
      effective, retained, cascade-for-free); Leo M. verified identical; the two new invariants
      (least-privilege, one-directional privacy) **deepen** P-VII in data, not just UI.
- [x] **No editor (P-VIII)**: N/A — no studio/format surface.
- [x] **SDD scope (P-IX)**: one slice — model + read path + backfill; no UI (T7.2), no enforcement
      surfaces (T9). The scope gate is the minimum forward-contract the spec requires, not speculative.
- [x] **Ambiguity (P-XII)**: the one open question (Q1) was resolved by the human before planning; one
      new decision (column nullability/default + backfill home) is surfaced in research.md, not guessed.
- [x] **Port-completeness (P-XIII)**: N/A — no controls. Any future scope-default control (T7.2/T9
      settings) is out of scope here; it is **not** stubbed dead now.
- [x] **Owned data only (P-XIV)**: backfill restores the **full-trust behaviour the fixtures already
      had** (granted == usable everywhere) — honest, not an invented grant beyond what the fixture
      implied. No fabricated scope/metric.
- [x] **Plan-not-code (P-XV)**: **N/A — non-render slice.**
- [x] **No-LLM-in-render (P-XVI)**: **N/A — non-render slice.**

**Definition of done (P-Governance)**: builds green (typecheck + lint + build); fixtures coherent after
reseed; Leo M. unchanged; the scope gate + resolver verified per quickstart. No empty/loading/error or
responsive/keyboard items apply (no UI surface in this slice).

## Project Structure

### Documentation (this feature)

```text
specs/T7.1-scoped-consent-model/
├── plan.md              # This file
├── research.md          # Phase 0 — the storage-shape decision + nullability/backfill
├── data-model.md        # Phase 1 — enums, columns, indexes, payload shape, privacy ordering
├── contracts/
│   └── consent-model.md # Phase 1 — helper/function signatures (the read path + scope gate + resolver)
├── quickstart.md        # Phase 1 — reseed + verify steps (no test framework)
└── checklists/
    └── requirements.md  # from /speckit-specify
```

### Source Code (repository root) — files this slice touches

```text
src/
├── db/
│   ├── schema.ts        # + consentScopeEnum, nameDisplayEnum; + consent.useScope/nameDisplay/showFace
│   │                    #   + workspace.defaultNameDisplay/defaultShowFace; + GIN index on use_scope
│   ├── queries.ts       # + latestConsentScope/NameDisplay/ShowFace siblings (mirror latestConsentVersion)
│   │                    #   + effectiveConsentGrantsScope() SQL predicate; + consentGrantsScope() async
│   │                    #   + getEffectiveConsentDisplay() read; EXTEND getGrantedConsentId return shape
│   └── seed.ts          # write useScope/nameDisplay/showFace inline; set workspace display defaults
├── lib/
│   └── consent.ts       # + ConsentScope/NameDisplay unions, ConsentDisplay type; + resolveDisplay()
│                        #   (one-directional privacy), + DEFAULT_USE_SCOPE, + privacy-ordering consts
drizzle/
└── 0005_*.sql           # generated additive migration + a backfill UPDATE (granted → full scope, display)
```

**Structure Decision**: single-app `src/` layout; all changes are in the data layer (`src/db`) and the
shared consent lib (`src/lib/consent.ts`). No route, component, or action files change.

---

## Design

### D1 — Storage shape (the crux). DECISION: typed columns; enum-array for the gate.

**Decision criterion (stated and designed to):** `useScope` must be queryable as a clean scope gate —
T9 must filter "clips whose consent grants scope X" **without unpacking a jsonb blob per row**.

| Field | Shape | Why |
|---|---|---|
| `useScope` | `consent_scope[]` enum-array column + **GIN index** | Containment (`@>`, `&&`) is a single indexed predicate; the fails-closed gate is a clean correlated subselect, not a JSON scan. Enum (not `text[]`) keeps the domain closed (P-XIV) and mirrors the existing `consentStateEnum`/`clipFormatEnum` idiom. |
| `nameDisplay` | `name_display` enum column | Presentation-only; never gated/filtered. A typed enum is the smallest honest shape. |
| `showFace` | `boolean` column | Presentation-only boolean. |
| workspace defaults | `default_name_display` enum + `default_show_face` boolean on `workspace` | Q1=A: the singleton workspace row. Two small typed columns; no new table, no jsonb. |

**No jsonb is used for `ConsentDisplay`.** Because all three fields are typed columns, there is **no
jsonb/typed split to justify** — the gate criterion is satisfied and display prefs are equally clean.
`consent.captureContext` (existing jsonb) stays exactly as-is (it records capture provenance, not display
prefs). Alternatives (jsonb blob; junction table) are weighed and rejected in research.md.

### D2 — Additive migration `0005`

1. `CREATE TYPE consent_scope AS ENUM ('organic','paid','showcase','embed');`
2. `CREATE TYPE name_display AS ENUM ('full','first_initial','anonymous');`
3. `ALTER TABLE consent ADD COLUMN use_scope consent_scope[] NOT NULL DEFAULT '{}';` — empty default =
   **permits nothing** (fail-closed), the safe baseline for any row not explicitly granted scope.
4. `ALTER TABLE consent ADD COLUMN name_display name_display;` (nullable — falls back to workspace
   default → built-in constant)
5. `ALTER TABLE consent ADD COLUMN show_face boolean;` (nullable — same fallback chain)
6. `ALTER TABLE workspace ADD COLUMN default_name_display name_display;` (nullable)
7. `ALTER TABLE workspace ADD COLUMN default_show_face boolean;` (nullable)
8. `CREATE INDEX consent_use_scope_gin ON consent USING gin (use_scope);`
9. **Backfill UPDATE (idempotent — see D5)** — set existing **granted** versions to full scope +
   display matching today's presentation.

Drizzle generates 1–8 from `schema.ts`. Step 9 is appended to the generated `0005_*.sql` by hand (a data
backfill drizzle-kit will not author) — this is a permitted in-migration data step (Constitution X: raw
SQL is allowed **inside migrations**).

> **Why `NOT NULL DEFAULT '{}'` is safe on existing rows:** the column default sets every pre-existing
> row's `use_scope` to empty; the backfill UPDATE (step 9) then promotes **granted** rows to full scope.
> Even before the backfill runs, **no current consumer reads `use_scope`** (they gate on `state` only),
> so there is zero behavioural window. The default + backfill exist purely for forward-coherence and
> honesty when T7.2/T9 begin reading scope.

### D3 — Extended read path (byte-stable additions)

**New sibling helpers** in `queries.ts`, each a correlated latest-version subselect mirroring the
existing `latestConsentVersion` exactly (same `order by version desc limit 1`):

- `latestConsentScope` → `consent_scope[] | null`
- `latestConsentNameDisplay` → `name_display | null`
- `latestConsentShowFace` → `boolean | null`

The existing `latestConsentState` / `latestConsentVersion` / `latestConsentEffectiveAt` and
`effectiveConsentState(col)` / `effectiveConsentGranted(col)` are **byte-unchanged**.

**New read function** (the clean entry point T7.2 / verified bar will consume):

```ts
getEffectiveConsentDisplay(workspaceId, proofId): Promise<ConsentDisplay | null>
```

Returns the **effective version's** resolved `{ useScope, nameDisplay, showFace }` (display fields
already resolved through the fallback chain — D6), or `null` if no consent row. Workspace-scoped via the
proof join. **No existing surface calls it in T7.1** (US1-scenario-3 byte-stability); it exists for
downstream + verification.

**Extended `getGrantedConsentId`** — additively widen the return from `{ consentId }` to
`{ consentId, useScope, nameDisplay, showFace }` (the effective granted version's payload). Callers that
read only `.consentId` (the generate gate, `recordConsentWithdrawal`) are **byte-stable**; the extra
fields are available for the generate path / verified bar later.

### D4 — The scope gate (the fails-closed forward-contract T9 consumes)

Two forms, both fail closed (non-granted ⇒ every scope `false`):

**(a) SQL predicate** — for filtering clips/proofs by scope in a `WHERE`:

```ts
effectiveConsentGrantsScope(proofIdColumn: AnyColumn, scope: ConsentScope): SQL
// (
//   select c.state = 'granted' and c.use_scope @> array[${scope}]::consent_scope[]
//   from consent c where c.proof_id = ${proofIdColumn}
//   order by c.version desc limit 1
// ) is true
```

The trailing `is true` coerces "no row" (NULL) → `false` — **fail-closed**. Built on the same
latest-version subselect as `effectiveConsentGranted`, so the state semantics are identical; the GIN
index serves the containment. T9 uses this to express "only clips whose consent grants `paid`" as one
indexed predicate.

**(b) async boolean** — for imperative channel checks:

```ts
consentGrantsScope(workspaceId, proofId, scope: ConsentScope): Promise<boolean>
```

Workspace-scoped; returns `false` for missing/cross-workspace/non-granted/scope-absent. Mirrors
`getGrantedConsentId`'s shape (`withDbRetry`-wrapped read).

> **Empty `useScope` ⇒ permits nothing** and **unknown/legacy scope value ⇒ ignored** (FR-012): the
> enum type makes "unknown value" unrepresentable at write time, and `@>` on an empty array is always
> `false` — both fall out of the design for free.

### D5 — Backfill / seed (idempotent, shared-DB-safe)

**Two coordinated paths, both honest (P-XIV):**

1. **Migration backfill (for already-deployed prod rows, no reseed):** the hand-appended UPDATE in
   `0005`:
   - `UPDATE consent SET use_scope = '{organic,paid,showcase,embed}' WHERE state = 'granted' AND use_scope = '{}';`
     — promotes existing **granted** versions to **full scope** (the behaviour they already had).
     Guarded by `use_scope = '{}'` so a re-run is a **no-op** (idempotent).
   - `UPDATE consent SET name_display = 'full', show_face = true WHERE name_display IS NULL;` —
     `full` = show the stored name verbatim = **today's exact presentation** (the fixture names like
     "Darnell W." are already author-abbreviated; `full` renders them unchanged). Idempotent via the
     `IS NULL` guard.
   - Non-granted (awaiting/revoked) versions keep `use_scope = '{}'` — they grant nothing (correct;
     the gate fails closed on them anyway).
2. **Seed (the primary demo path):** `seed.ts` already **wipes + re-inserts** all consent rows, so it
   writes the new fields **inline** at insert:
   - granted versions → `useScope: ['organic','paid','showcase','embed']`, `nameDisplay: 'full'`,
     `showFace: true` (full-trust demo coherence, matching the migration backfill).
   - awaiting / revoked versions → `useScope: []` (grants nothing); display left to fallback or set to
     `full`/`true` for tidiness.
   - the demo **workspace** row → `defaultNameDisplay: 'first_initial'`, `defaultShowFace: true`
     (the privacy-forward default **new** captures (T7.2) will inherit — distinct from the existing
     rows' `full` backfill; see research.md R4).

**Least-privilege vs backfill are not in conflict:** backfill = *restore prior full-trust behaviour of
existing demo rows*; the `organic`-only default governs **future** captured consent (T7.2 / the app
insert path in D6). The seed never relies on a DB default for new full-scope rows — it writes scope
explicitly, so intent is auditable.

### D6 — One-directional privacy resolver (the single enforcement point)

A **pure function** in `src/lib/consent.ts` (client-safe, no DB), called by **T7.2's capture write** and
by `getEffectiveConsentDisplay` when resolving display for read:

```ts
resolveDisplay(
  wsDefault: { nameDisplay: NameDisplay; showFace: boolean },
  override?: Partial<{ nameDisplay: NameDisplay; showFace: boolean }>,
): { nameDisplay: NameDisplay; showFace: boolean }
```

**Privacy ordering** (higher = more private):
`nameDisplay`: `full (0) < first_initial (1) < anonymous (2)`; `showFace`: `true (0) < false (1)`.

**Rule:** per field, `resolved = morePrivate(wsDefault, override)` — the override can only **raise**
privacy. A less-private override is **clamped to the default** (never recorded below the floor); equal is
accepted; absent override ⇒ the default. This guarantees FR-005 / US2: the customer is **never recorded
as less private than they chose**, and can always be more private than the workspace default.

`resolveDisplay` is where "more-private-only" is **enforced**; T7.2 must route the customer's choice
through it before writing a consent version. A companion `DEFAULT_USE_SCOPE: ConsentScope[] = ['organic']`
(+ a `withFallback` for the built-in workspace default when its columns are null — assumed
`{ nameDisplay: 'first_initial', showFace: true }`, research.md R4) completes the pure-logic surface.

### D7 — The P-V regression surface (FR-010) — how each stays byte-stable

All gate on `effectiveConsentGranted` (= `state = 'granted'`), which **does not read scope/display** —
so each is byte-stable **by construction** (the new columns are invisible to them):

| Consumer | Reads consent via | Byte-stable because |
|---|---|---|
| Inbox / `ProofCard` (`getProofs`) | `latestConsentState` | state-only; new siblings unused here |
| Library (`getLibraryClips`) | `effectiveConsentGranted(derivedAsset.proofId)` | gate is state-only |
| Dashboard (`getDashboardSummary`) | `effectiveConsentGranted` | gate is state-only |
| Export (`getClipExport`/`getClipExports`) | `effectiveConsentGranted` | gate is state-only |
| Warmth (`src/lib/warmth.ts`) | `consentState === 'granted'` (in-memory) | reads `consentState` only |
| Showcase (`getShowcase`) | `effectiveConsentGranted` | gate is state-only |
| Clip detail (`getClip`) | `effectiveConsentGranted(derivedAsset.proofId)` | gate is state-only |
| Proof detail (`getProof`) | `latestConsentState/Version/EffectiveAt` | those helpers unchanged |
| T5 consent ledger (`getConsentLedger`/`getConsentHistory`/`getProofConsentClips`) | `latestConsent*` + `consent.state` | unchanged helpers; no scope read |
| Generate gates (`getGrantedConsentId` in `generateClip`/`generateBatch`) | `.consentId` only | return widened additively; `.consentId` unchanged |

T7.1 wires the new scope/display into **none** of these. The only behavioural change anywhere is the
**availability** of the new helpers/gate for downstream slices.

---

## Phase 0 — research.md

Resolves: (R1) storage shape trade-offs (enum-array vs jsonb vs junction); (R2) GIN-indexed containment
& Drizzle `.array()` viability; (R3) `NOT NULL DEFAULT '{}'` vs nullable for `use_scope`; (R4) the
built-in workspace display-default fallback constant; (R5) backfill idempotency on the shared DB; (R6)
the privacy-ordering definition. **No NEEDS CLARIFICATION remain** (Q1 resolved; one new decision —
nullability/backfill home — decided in R3/R5, not guessed).

## Phase 1 — data-model.md, contracts/, quickstart.md

- **data-model.md** — the two enums, the five columns, the GIN index, the `ConsentDisplay` payload, the
  privacy ordering, and the latest-version-wins + fail-closed resolution rules.
- **contracts/consent-model.md** — exact TS signatures: the sibling helpers, `effectiveConsentGrantsScope`,
  `consentGrantsScope`, `getEffectiveConsentDisplay`, the widened `getGrantedConsentId`, and the pure
  `resolveDisplay` / `DEFAULT_USE_SCOPE`.
- **quickstart.md** — reseed + verify (no framework): Leo M. still withdrawn; scope gate permits full-scope
  clips and denies a hypothetical organic-only one; resolver clamps a less-private override; build green.

## Complexity Tracking

No constitution violations — table omitted. (No new dependency, no UI, no render path, no editor; the
only raw SQL is the in-migration backfill, which Constitution X explicitly permits.)
