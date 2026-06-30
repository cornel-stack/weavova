# Phase 0 — Research: T7.5 Verification basis

Decisions resolving the mechanics. Policy is settled at `/speckit.clarify` (verified bar = strong OR
medium; nothing live earns it this slice; in-between = absence on cards + label on detail; resolver =
consent AND basis). The decisions below are the *how*, grounded in the real schema.

---

## D1 — The chokepoint: how `proof.verified` stops being a directly-readable stale boolean

**Problem**: today `proof.verified` (a static `boolean NOT NULL default false`, `src/db/schema.ts:108`)
is selected raw into ~8 SQL projections (`src/db/queries.ts:130,380,397,616,677,962` …) and flows to
every surface as `view.verified`. The P-XIV guarantee requires that **a future surface cannot
accidentally read a stale boolean and drift** — convention is not enough.

**Decision**: the verified state is produced **only** by the resolver. Mechanically:
1. `verified` is **removed from every projection row type** (`proofColumns`, the clip projections, the
   showcase/export projections). No `select({ ... verified: proof.verified ... })` remains anywhere.
2. Each projection instead selects the resolver's **inputs**: the already-present effective
   `consentState` (via `effectiveConsentState`) + a new boolean `hasQualifyingBasis` (via
   `qualifyingBasisExpr`, D3). These are *internal* row fields, not exposed on the public view shape.
3. `toView` / `toDetailView` / the clip mappers compute `verified = proofIsVerified({ consentState,
   hasQualifyingBasis })` (D4). `view.verified` keeps its boolean type and is byte-stable for cards.
4. The `proof.verified` **column is marked write-frozen/internal** in `schema.ts` with a comment: it is
   never read by application code; its only legacy is migration history. Seed stops writing it as the
   source of truth (it becomes derived; see D7).

**Why this is a chokepoint, not a convention**: after step 1 there is no code path that reads
`proof.verified`. A new surface can only obtain verified-state by importing `proofIsVerified` (the
column isn't in any view type it consumes). A developer who hand-writes `select({ verified:
proof.verified })` would be reintroducing a now-dead column flagged in the schema — visible in review,
and producing a value the rest of the app's types don't expose.

**Flagged sub-decision (confirm at `/speckit-tasks`)** — *fully drop* vs *retire-in-place*:

| Option | What | Implication |
|--------|------|-------------|
| A *(recommended)* — retire-in-place | Keep `proof.verified` column (additive migration only); remove all reads; mark write-frozen | Matches the stated migration deliverable ("additive: verification_basis … + transaction_verified_at made real"); no destructive DDL on the shared Neon DB; the column is unreferenced and inert |
| B — drop the column in 0009 | `ALTER TABLE proof DROP COLUMN verified` | Strongest possible structural guarantee (literally unreadable), but **non-additive** — contradicts the additive-migration deliverable, and `proof.verified` carried real demo intent that D7 must first migrate into bases. Defer to a later cleanup slice |

**Recommendation**: **A** — retire-in-place this slice; record B as a follow-up. The type-level removal
already delivers the practical "can't read verified-state except through the resolver" guarantee.

---

## D2 — The graded basis model (absorbs deferred sources without rework)

**Current** `verification_basis` (`schema.ts:450`): `id, proofId, requestId (NOT NULL → capture_request),
consentCapturedAt (NOT NULL), transactionVerifiedAt (nullable, the stub), createdAt`.

**Decision — additive columns + enums (migration 0009)**:

- `basis_strength` enum: `strong` (system-confirmed native transaction) · `medium` (webhook-evidenced) ·
  `weak` (manual merchant assertion / plain link). Add column `strength basis_strength NOT NULL DEFAULT
  'weak'` — existing T7.2-captured rows are link/manual → correctly default `weak`.
- `basis_source` enum: `native` · `webhook` · `manual`. Add column `source basis_source NOT NULL DEFAULT
  'manual'` — existing rows are manual-link → correctly `manual`.
- `transaction_ref text` (nullable) — the reference identifying the evidence (order id, etc.).
- `transaction_verified_at` — **already exists** (nullable); "made real" = code now *writes* it for
  qualifying bases. No DDL for this column.
- `request_id` → **DROP NOT NULL** (additive). A native/webhook/seed basis has **no** `capture_request`
  (it does not originate from a `/c/[token]` link), so the FK must be optional. This is the key shape
  change that lets the deferred Sources track write bases (D5) and lets the backfill (D7) attach bases
  to the 5 pre-T7.2 fixtures, which have no capture_request.

No change to the consent model, token model, or any other table (constraint honored).

---

## D3 — The verified-bar predicate (the resolver's basis leg)

**Decision** — a proof has a *qualifying* basis iff:

```
EXISTS (verification_basis b WHERE b.proof_id = <proof>
        AND b.strength IN ('strong','medium')
        AND b.transaction_verified_at IS NOT NULL)
```

Both conditions, deliberately (FR-019 / spec edge case "strong basis present but transaction reference
missing"): a row claiming `strength='strong'` with a null `transaction_verified_at` is an unevidenced
claim and **must not** earn the stamp. Requiring a real confirmed-at makes the bar self-defending even
against a malformed basis row. (By construction D5/D7 always set `transaction_verified_at` when writing
strong/medium, so this never excludes a legitimate basis.)

Implemented as `qualifyingBasisExpr(proofIdColumn)` in `queries.ts`, mirroring the existing
`effectiveConsentState` correlated-subselect pattern. Surfaced into projections as the internal boolean
`hasQualifyingBasis`.

**Index**: add a supporting index on `verification_basis(proof_id)` (the EXISTS correlation key) — the
table is small but this keeps the subselect on every proof projection cheap and matches the
`consent_proof_version_idx` precedent.

---

## D4 — The resolver: signature + three honest states

**Decision** — new pure module `src/lib/verification.ts` (type-only DB import, no Drizzle in bundle):

```ts
export type VerificationState = "verified" | "consent_only" | "unverified_no_consent";

export function verificationState(input: {
  consentState: ConsentState;        // effective (latest-version) consent — from T7.1 read
  hasQualifyingBasis: boolean;       // qualifyingBasisExpr (D3)
}): VerificationState {
  if (input.consentState !== "granted") return "unverified_no_consent"; // P-VII — consent necessary
  return input.hasQualifyingBasis ? "verified" : "consent_only";
}

export function proofIsVerified(input: {...}): boolean {
  return verificationState(input) === "verified";
}
```

- **Cards** consume `proofIsVerified` as a boolean → stamp or absence (no card change).
- **Detail** consumes the richer `verificationState`:
  - `verified` → the persimmon stamp (ported, unchanged).
  - `consent_only` → the quiet "Consent recorded · transaction unconfirmed" label (the ONE new UI).
  - `unverified_no_consent` → neither stamp nor label; the existing consent meta already shows
    awaiting/revoked (e.g. Leo M.'s "revoked" chip).
- **Consent-AND-basis** is encoded by the `consentState !== "granted"` short-circuit: a strong basis on a
  withdrawn proof returns `unverified_no_consent` (SC-004 / Leo M.).

---

## D5 — Forward contract for the deferred Sources track (no-rework guarantee)

**Decision** — when T7.4 (generic webhook) and the later native connectors land, they earn the stamp by
**writing a verification_basis row**, nothing more:

| Future source | writes a basis with | resolver result (consent granted) |
|---------------|---------------------|-----------------------------------|
| Native connector (e.g. Shopify order) | `source='native', strength='strong', transaction_verified_at=<order time>, transaction_ref=<order id>, request_id=null` | verified |
| Generic webhook payload | `source='webhook', strength='medium', transaction_verified_at=<event time>, transaction_ref=<payload id>, request_id=null` | verified |

The resolver and `qualifyingBasisExpr` are **unchanged** by that work — they already honor any
strong/medium evidenced basis. This is what D2's nullable `request_id` and graded enums buy: the Sources
track is a *writer* against a stable contract, not a resolver change. (Stated explicitly so a future
slice does not "improve" the resolver.)

---

## D6 — What writes a basis NOW (live capture stays below the bar)

**Decision** — `writeCapturedProof` (`queries.ts:1593`, the T7.2/T7.3 capture insert) continues to write
a `verification_basis` row, now explicitly typed: `source='manual', strength='weak', transaction_ref =
<capture_request.transaction_ref or null>, transaction_verified_at = null`. The merchant-supplied
`transaction_ref` is an **assertion**, recorded as context only — `weak` → below the bar → no stamp.

- This is a change to the query helper `writeCapturedProof`, **not** to the `/c/[token]` route or any
  file under `src/app/c/**` (FR-014 honored — the route calls the helper; the helper's basis fields
  change, the route does not).
- Result: a proof captured today shows the honest in-between (`consent_only`) — exactly the intended,
  truthful "nothing live earns the stamp yet" outcome (Q2 → A).

---

## D7 — Backfill / seed (demo stays coherent; idempotent)

Seed (`src/db/seed.ts`) is already idempotent — it `delete`s every table in FK-safe order
(`seed.ts:181–193`, including `verificationBasis`) then reinserts. Backfill = add basis inserts in that
existing reinsert pass; re-running reseeds cleanly.

**Decision**:
- The **5 currently-`verified: true` fixtures** (Darnell W. / stripe, Maria L. / shopify, Aisha K. /
  instagram, Hannah P. / square, Greta S. / calendly) get a basis: `source='native', strength='strong',
  transaction_verified_at = <the fixture's capturedAt>, transaction_ref = <a modelled order id>,
  request_id = null`. These legitimately meet the bar → the resolver returns `verified` → the stamp
  shows for exactly this set (SC-002 byte-stable).
- **Granted-consent unverified fixtures** (Marcus T., Yuki N., Caleb W., Nadia F., Priya R.) get a
  `source='manual', strength='weak', transaction_verified_at=null` basis — they exercise the bar
  (recorded basis, still below it) and produce the `consent_only` detail label (SC-006).
- **Awaiting / revoked fixtures** (Tom B., Sofia D., Diego R., Owen B.; Leo M. revoked) need no
  qualifying basis — they are `unverified_no_consent` regardless. Leave them without a basis (or weak);
  the resolver short-circuits on consent. **Leo M. stays unverified even if later given a strong basis**
  (the quickstart proves this).
- The `Fixture.verified` boolean stays in the seed fixture type as the **author's intent marker** that
  *drives which proofs get a qualifying basis* (no longer written to `proof.verified` as truth). This
  keeps the fixture file readable and the verified set declared in one place.

---

## D8 — The byte-stable consumer swap (P-V)

The 11 component read sites consume `view.verified` (a boolean on the view) — they **do not change**,
because `view.verified` keeps its type and value (resolver-computed) for every existing fixture. The
actual edits are concentrated in the **query/seed/resolver layer** + **one component**:

- **Changes**: `queries.ts` projections (swap `proof.verified` → `hasQualifyingBasis` + resolver),
  `src/lib/verification.ts` (new), `proof.ts` (`ProofDetailView` gains `verificationState`), `seed.ts`
  (backfill), `proof-detail-meta.tsx` (the new label).
- **Unchanged (byte-stable)**: proof card, dashboard hero, showcase item (proof + clip), clip studio,
  clip detail, library clip card, export attribution — they read the resolver-fed `verified` boolean.

**Byte-stability proof**: for every existing fixture, `proofIsVerified` reproduces the old
`proof.verified`:
- the 5 verified fixtures → granted consent + backfilled strong basis → `verified=true` → stamp (same as
  before);
- all previously-unverified fixtures → either consent not granted, or no qualifying basis →
  `verified=false` → no stamp (same as before).

So **cards/showcase/library/export render identically**; the **only** new pixel is the `consent_only`
label on proof **detail**. See `contracts/consumer-swap.md` for the per-site table.
