# Quickstart — Scoped consent model verification

No test framework is installed and none is added (P-III). Verification is build-green + a reseed and a
small set of read-path checks. Run from repo root.

## Prerequisites

- `.env.local` with `DATABASE_URL` (Neon) — the existing dev/shared DB config.
- Migration `0005` generated and applied.

## 1. Generate + apply the migration

```bash
npm run db:generate     # drizzle-kit emits drizzle/0005_*.sql from schema.ts
# hand-append the two idempotent backfill UPDATEs to drizzle/0005_*.sql (see contracts §5)
npm run db:migrate      # applies enums, columns, GIN index, backfill
```

**Expected**: migration applies cleanly; re-running `db:migrate` is a no-op (the backfill UPDATEs are
guarded). Existing granted consent rows now have `use_scope = {organic,paid,showcase,embed}`.

## 2. Reseed the demo data

```bash
npm run db:seed
```

**Expected**: fixtures re-inserted with the new fields written inline — granted versions full-scope,
`nameDisplay='full'`, `showFace=true`; awaiting/revoked versions `use_scope='{}'`; the Lumen workspace
seeded with `default_name_display='first_initial'`, `default_show_face=true`.

## 3. Build green (the DoD gate)

```bash
npm run typecheck && npm run lint && npm run build
```

**Expected**: all green. No existing surface changed behaviourally.

## 4. Read-path checks (verify via a throwaway script or psql)

### 4a. P-VII unchanged — Leo M. still withdrawn (the regression guard)

- `getEffectiveConsentDisplay(workspaceId, leoProofId)` → reflects the **revoked** effective version;
  `consentGrantsScope(ws, leoProofId, 'organic')` → **false** (non-granted ⇒ all scopes denied).
- Leo M.'s clip is still **withheld** from Library / showcase / export (unchanged consumers).
- His consent **history** still shows the retained `v1 granted → v2 revoked` timeline (T5 ledger).

### 4b. Scope gate — permit/deny + fail-closed

- A full-scope granted proof: `consentGrantsScope(ws, p, 'paid')` → **true** for each of
  organic/paid/showcase/embed.
- A proof manually set to `use_scope='{organic}'`: `consentGrantsScope(ws, p, 'paid')` → **false**;
  `'organic'` → **true**.
- An awaiting proof: every scope → **false**. A proof with no consent row: every scope → **false**.
- The SQL form: a `SELECT` over `derived_asset` joined to `proof` filtered by
  `effectiveConsentGrantsScope(derived_asset.proof_id, 'paid')` returns only clips whose effective
  consent grants `paid` — verify it uses the GIN index (`EXPLAIN`), not a JSON scan.

### 4c. One-directional privacy resolver (pure — assert inline)

With `wsDefault = { nameDisplay:'first_initial', showFace:true }`:
- `resolveDisplay(wsDefault, { nameDisplay:'anonymous' })` → `nameDisplay:'anonymous'` (more private ✓)
- `resolveDisplay(wsDefault, { nameDisplay:'full' })` → `nameDisplay:'first_initial'` (clamped — less
  private not allowed ✓)
- `resolveDisplay(wsDefault, { showFace:false })` → `showFace:false` (more private ✓)
- `resolveDisplay(wsDefault, { showFace:true })` → `showFace:true` (equal/clamped ✓)
- `resolveDisplay(wsDefault)` → `wsDefault` (no override ✓)
- `resolveDisplay({nameDisplay:'anonymous',showFace:false})` against a null workspace default falls back
  to `BUILTIN_DISPLAY_DEFAULT` before clamping.

### 4d. Byte-stability spot-check (FR-010)

- Dashboard counts, inbox states, Library/showcase/export contents, warmth ordering, clip-detail, proof
  detail, and the T5 consent ledger render **identically** to pre-`0005` (the new columns are invisible
  to those state-only consumers).

## Done when

- Migration applies + is idempotent on re-run; reseed coherent.
- `typecheck` + `lint` + `build` green.
- 4a–4d all pass: Leo M. unchanged; scope gate correct + fail-closed + GIN-served; resolver clamps
  toward privacy; existing consumers byte-stable.
