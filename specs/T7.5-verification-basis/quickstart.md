# Quickstart — Validate T7.5 Verification basis

Runnable validation that the two-leg stamp is earned, the in-between is honest, and the P-VII boundary
holds. Fixtures-first; no test runner.

## Prerequisites

- `.env.local` with `DATABASE_URL` (shared Neon).
- Migration `0009` generated from `schema.ts` and present in `./drizzle`.

## Setup

```bash
npm run db:generate     # emits 0009 (2 enums + 3 cols + request_id DROP NOT NULL) — review the SQL is additive
npm run db:migrate      # applies 0009 over Neon (idempotent; additive)
npm run db:seed         # idempotent: deletes + reinserts; now backfills verification_basis (D7)
npm run dev             # localhost:3000
```

## Scenario 1 — The stamp is earned (SC-001, SC-002)

1. Open `/app/proof` (inbox) and `/app` (dashboard).
2. **Expect**: the "Verified real customer" stamp on exactly **Darnell W., Maria L., Aisha K., Hannah P.,
   Greta S.** — the same set as before this slice (byte-stable). No previously-unverified proof newly
   shows it.
3. Open `/app/library` and `/showcase` — the same five (and clips under them) carry the stamp; no others.

**Why it passes**: each of the five has granted consent + a backfilled `strong` native basis with a
confirmed `transaction_verified_at` → `qualifyingBasisExpr` true → `proofIsVerified` true.

## Scenario 2 — The honest in-between (SC-006)

1. Open proof detail for **Marcus T.** (`/app/proof/[id]`) — granted consent, no qualifying basis.
2. **Expect**: **no** persimmon stamp; instead the quiet **"Consent recorded · transaction unconfirmed"**
   label (non-persimmon, recedes). Not a blank, not a dead control.
3. Open **Marcus T.** in the inbox card view — **expect** plain absence of the stamp (no badge, no label
   — the absence is the signal). Same for Yuki N., Caleb W., Nadia F., Priya R.

## Scenario 3 — P-VII boundary: consent is necessary (SC-004)

1. **Leo M.** (consent revoked v2) shows **no** stamp anywhere and **no** in-between label (his consent
   meta shows "revoked").
2. **Force-feed test** (temporary, to prove the AND): in `seed.ts` (or a scratch insert) give Leo M. a
   `strong` basis with `transaction_verified_at` set, reseed, reload.
3. **Expect**: Leo M. is **still not verified** — `verificationState = unverified_no_consent` because the
   resolver short-circuits on non-granted consent. Revert the scratch change.

## Scenario 4 — The chokepoint (P-XIV)

1. `grep -rn "proof.verified" src/` → **expect** no read in any projection/component; only the schema
   column definition (marked write-frozen) remains.
2. `grep -rn "\.verified" src/components src/lib` → every consumer reads a view field produced by the
   resolver, never the raw column.
3. **Expect**: the only module exporting verified-state is `src/lib/verification.ts`.

## Scenario 5 — Forward contract (no-rework, D5)

1. Insert a `webhook`/`medium` basis (with `transaction_verified_at`, `request_id=null`) for a
   granted-consent unverified proof (e.g. Marcus T.) via a scratch insert; reload its detail.
2. **Expect**: Marcus T. flips to the **stamp** with **no code change** to the resolver or any surface —
   proving the model accepts graded bases for the deferred Sources track (SC-005). Revert.

## Build gate

```bash
npm run lint && npm run build   # must be green (TS strict; no any)
```

## Pass criteria (maps to spec Success Criteria)

- SC-001/002 — Scenario 1 (stamp only on the genuine set; byte-stable).
- SC-003 — Scenario 4 (all reads via the resolver).
- SC-004 — Scenario 3 (Leo M. not verified even with a strong basis).
- SC-005 — Scenario 5 (graded basis flips state, no schema/resolver change).
- SC-006 — Scenario 2 (honest in-between, never blank/dead).
