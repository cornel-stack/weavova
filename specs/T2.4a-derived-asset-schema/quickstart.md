# Quickstart — Validate T2.4a Derived-Asset Schema, Cascade & Seed

A run/validation guide. Implementation details live in `plan.md` / `tasks.md`. This proves the slice
meets its acceptance criteria and Definition of Done — especially the **P-VII read-time withdrawal**.

## Prerequisites

- `.env.local` with a pooled Neon `DATABASE_URL`.

## Apply the schema + seed

```bash
npx drizzle-kit generate     # generates drizzle/0001_*.sql for derived_asset + enums (COMMIT it + drizzle/meta)
npm run db:migrate           # neon-http migrator applies 0001 (additive — existing tables/data intact)
npm run db:seed              # re-runnable; seeds derived_asset (active clips + Leo M. withdrawn clip)
```

## Functional validation (acceptance criteria)

1. **Dashboard lights up (US1 / FR-008)**: open `/app`; "clips this month" shows the **real** count of
   this month's non-withdrawn clips (no longer `0`), and the latest-clip cell shows the most recent
   non-withdrawn clip (customer + date) — **no** view/reach/engagement figure (FR-019).
2. **Detail generated assets (US2 / FR-008)**: open a **granted** proof with a seeded clip (e.g. Maria
   L.) → its "Generated assets" section lists the clip (format/kind + date, honest sample reference);
   open a proof with no clips → the section is honestly empty/absent (no fabricated "· N").
3. **Cascade — born-then-withdrawn (US3 / SC-003 / P-VII)**: open **Leo M.** (granted→revoked) → his
   seeded clip is **absent** from his "Generated assets" (withdrawn via his revoked effective consent),
   and it is **not** counted in the dashboard "clips this month" — even though the row exists in
   `derived_asset` (audit). This is the cascade, observable in static seed data.
4. **Honest, owned counts (US4 / FR-010,019)**: change a fixture (add/remove a clip; or flip a proof's
   consent to revoked) and reseed → the dashboard count, latest clip, and detail generated-assets change
   accordingly, with **no** un-owned metric anywhere.
5. **Empty state**: a zero-clip workspace shows "clips this month" `0`, no latest clip, and no
   generated-assets — unchanged honest-empty (FR-008).

## Cascade / integrity spot-checks (SQL, optional)

```sql
-- the withdrawn clip's row still exists (audit), but its proof's effective consent is revoked:
select da.id, da.created_at,
       (select c.state from consent c where c.proof_id = da.proof_id order by c.version desc limit 1) as eff_consent
from derived_asset da join proof p on p.id = da.proof_id
where p.customer_name = 'Leo M.';      -- expect a row with eff_consent = 'revoked' (withdrawn from reads)

-- hard-delete integrity (no orphans): deleting a proof cascades to its derived assets.
```

## Definition of Done checks

```bash
# ProofCard byte-unchanged (FR-012) — must produce NO output:
git diff --quiet HEAD -- src/components/proof-card.tsx && echo "ProofCard unchanged ✓"

# Shared proof shapes + reads byte-stable (output unchanged; only latestConsentState refactored):
#   git diff src/lib/proof.ts     → expect NO change (ProofView/ProofCardProps/ProofDetailView untouched)
#   git diff src/db/queries.ts    → getProofs/proofColumns/toView/getProof UNCHANGED; only the
#                                    latestConsentState definition (→ effectiveConsentState(proof.id)),
#                                    the dashboard clip swap, getProofClips, and the helper are new
#   git diff src/components/app/dashboard/dashboard-kpis.tsx → expect NO change (data-only swap)

# Existing tables/data unchanged (additive migration): 0001 only CREATEs the enums + derived_asset.
grep -iE 'alter table (workspace|source|proof|consent)|drop ' drizzle/0001_*.sql || echo "additive only ✓"

# No new dependency:
git diff HEAD -- package.json package-lock.json   # expect no dependency additions

# Green build (incl. without DATABASE_URL — CI parity; migration/seed are separate steps):
npm run typecheck && npm run lint && npm run build
```

- **Re-runnable seed (FR-013)**: `npm run db:seed` twice in a row succeeds (FK-safe reset incl.
  `derived_asset`); relative dates keep "this month" populated.
- **Responsive + on-token (the detail section)**: the generated-assets section reflows at 480/1024/1280 +
  1240 max; on-token; keyboard-reachable.
- **Honest microcopy (FR-019)**: no view/reach/engagement, no fabricated counts; the sample clip is an
  honest stand-in (no claim of a real per-proof render).
