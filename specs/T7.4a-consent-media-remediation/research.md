# Phase 0 — Research: T7.4a Consent-Media Remediation

All decisions ground in the T7.4 trace + the live DB/code reality. Two decisions (D6, D7) are
**flagged** for confirmation at `/speckit-tasks` with recommended defaults. No open
`[NEEDS CLARIFICATION]` blocks the plan (Q1 is resolved → A).

---

## D1 — Q1 resolved: separate buckets (A)

**Decision**: Two R2 buckets — the existing PUBLIC brand-assets bucket (unchanged) + a NEW PRIVATE
customer-media bucket (`R2_CAPTURES_BUCKET`, no public domain, presigned-GET reads only).

**Rationale**: A private bucket makes consent-bearing media private **by construction**: with no
public domain mapped, there is no permanent public URL to leak — the only read is a signed, expiring
`presignCaptureRead`. This turns the two-object-classes split from a convention (storing a key
instead of a URL in one shared public bucket) into a structural guarantee (`assetUrlForKey` cannot
even address the captures bucket). It also makes withdrawal-delete belt-and-braces rather than the
*only* line of defense.

**Alternatives**: (B) one shared public bucket + key-storage + delete-on-withdrawal — rejected: a
constructed URL stays fetchable until deletion, so privacy depends entirely on the delete running and
on no public domain touching the customer prefix (private-by-obscurity). The user resolved Q1 → A.

---

## D2 — `r2.ts` two-config split; explicitly-named captures helpers (no cross-routing)

**Decision**: Split the lazy config into `getPublicConfig()` (today's `getConfig` — `R2_BUCKET` +
`R2_PUBLIC_BASE_URL`) and `getCapturesConfig()` (`R2_CAPTURES_BUCKET`, same account + creds, **no**
`publicBaseUrl`). Expose **separate, explicitly-named** helpers per object class:

- PUBLIC (brand) — unchanged behaviour: `assetUrlForKey(key)`, `presignPut(key, ct)`, the key
  builders `brandAssetKey` / `brandKitLogoKey`.
- PRIVATE (captures) — new: `presignCaptureUpload(key, ct)` (PUT to captures), `presignCaptureRead(key)`
  (signed GET), `deleteCaptureObject(key)`. The `captureMediaKey` builder is unchanged (same
  `capture/{ws}/{suffix}` path) but its objects now live in the captures bucket.

**Rationale**: Naming the helpers per class makes cross-routing impossible by construction — brand
code calls public helpers, capture/worker code calls captures helpers; there is no `bucket` flag to
get wrong. `assetUrlForKey` physically cannot produce a captures URL (it reads the public config's
base URL). Reuses one shared SigV4 client builder (no new dep).

**Alternatives**: a single `bucket: "public"|"captures"` parameter on each function — rejected: a
mis-passed flag could route customer media to the public bucket; explicit helpers can't.

---

## D3 — Capture stores the KEY (FR-001–003)

**Decision**: `src/app/c/[token]/actions.ts` switches the presign call from `presignPut` →
`presignCaptureUpload` (captures bucket), and `submitCapture` persists `mediaUrl = input.mediaKey`
(the raw key) instead of `assetUrlForKey(input.mediaKey)`.

**Rationale**: Root-cause fix. The schema comment already states `mediaUrl` holds "the captured
source-media R2 key" — the value now matches the contract. This also fixes the format inconsistency
(captured was a URL, normalized was a key — now both are keys) which is what broke the worker.
**The `/c/[token]` page UI is untouched** — only the action's internals change (it already returns a
key + uploadUrl; the client flow is identical).

---

## D4 — Worker fetch fix = bucket routing + key input (FR-004–005)

**Decision**: `worker/src/r2.ts` reads `R2_CAPTURES_BUCKET` (was `R2_BUCKET`); `getObject` /
`putObject` target the captures bucket; add `deleteObject(key)`. The worker now receives a **key**
in `media.captured.mediaKey` (because capture stores a key per D3), so `getObject(key)` builds the
correct R2 path and fetches successfully. `markNormalized` keeps writing a **key**
(`capture/{ws}/{proofId}/normalized.{ext}`) — now explicitly in the captures bucket.

**Rationale**: The worker only ever touches customer media, so it points wholly at the captures
bucket (it never needs the public brand bucket). The **normalize encode logic is unchanged**; only
the bucket the bytes come from/go to changes. The T7.4 failure contract (`media_status='failed'`,
original retained, no partial normalized) is preserved verbatim.

---

## D5 — Withdrawal hard-deletes both objects, in the data layer (FR-006–010)

**Decision**: Add `deleteCaptureObject(key)` (app) + `deleteObject(key)` (worker). The cascade lives
in `recordConsentWithdrawal` (`src/db/queries.ts`): after writing the `revoked` consent version
(authoritative), read the proof's `mediaUrl` + `normalizedMediaUrl` (both keys) and
`deleteCaptureObject` each. **Hard delete** (FR-008): the consent record is the retained-for-audit
artifact; the media is destroyed.

- **Ordering**: consent-version write FIRST (so the app surfaces gate immediately even if the delete
  errors), media-delete SECOND.
- **Idempotency**: deleting an absent object is a **no-op success** (R2 DELETE is idempotent;
  text/no-media proof → nothing to delete → no error; re-withdrawal → no error).
- **Why the data layer, not the action**: P-VII says consent is "enforced in data, not just UI."
  Putting the cascade in `recordConsentWithdrawal` means *every* caller of withdrawal (the current
  consent action, and any future bulk/API path) cascades to the file — it cannot be bypassed at the
  UI layer. `queries.ts` is server-only and already sits behind `aws4fetch`-importing actions, so
  importing the delete helper adds no client-bundle/dep impact.
- **Failure handling + the cheap reconcile (F2)**: the delete is awaited; a transient R2 failure is
  logged but does NOT fail the withdrawal — the **consent record is the authoritative gate** (it stays
  revoked → the resolver hides the proof in 100% of cases). The file delete is **best-effort +
  idempotently retried**: on a successful delete the object is destroyed; on transient R2 failure a
  residual window remains until a retry. The cheap reconcile we **do** ship is
  **delete-if-withdrawn-on-access**: `presignCaptureRead` (the only sanctioned read; T8's path) and
  any subsequent withdrawal touch **re-attempt `deleteCaptureObject`** when the proof is withdrawn —
  nearly free (delete is idempotent), and it shrinks the window without a full sweep. A periodic
  full orphan-sweep remains explicit **future hardening, out of scope here**. So SC-002 is stated
  honestly (best-effort delete + authoritative consent gate + on-access reconcile), not as an
  absolute "100% file unretrievable."

**Rationale**: Makes "revocation cascades to every derived asset" (P-VII) true at the file layer with
the minimum surface, on existing infra (no Inngest dependency — withdrawal-delete runs app-side).

---

## D6 — RESOLVED → A (atomic conditional write): the normalize-after-withdrawal orphan race (FR-010)

**Problem**: If consent is withdrawn while the worker is mid-normalize, the worker could `putObject`
the normalized file *after* the withdrawal already deleted both keys → an orphaned normalized object
for a withdrawn proof.

**Resolution → A, made ATOMIC.** The original A (re-check consent, *then* `markNormalized`) left a
TOCTOU window: a withdrawal landing **between** the read and the write could persist
`normalized_media_url` after the withdrawal cascade already read null + deleted → orphan. The fix is
to fold the consent check **into** the write as a single SQL statement — no read-then-write window:

```
markNormalized(proofId, normalizedKey):
  UPDATE proof
     SET normalized_media_url = :normalizedKey,
         media_status        = 'normalized'
   WHERE id = :proofId
     AND <effective-consent-granted predicate>      ← latest consent row by version, state='granted'
  → returns affected row count
```

- **Rows affected = 1** → consent held through the write; normalized persisted. Done.
- **Rows affected = 0** → consent was withdrawn during normalize (the predicate no longer matches).
  The worker then **`deleteObject(normalizedKey)`** (hard-delete its just-produced output from the
  captures bucket) and **does NOT** persist the URL. The worker's own output is subject to the
  cascade. No orphan can survive, with no read-then-write window.

**Terminal status (F4) — reuse `'failed'` (NO migration).** On the 0-row path the worker sets a
**terminal** `media_status = 'failed'` (NOT left at `'normalizing'`). `media_status` is a **pgEnum**
(`captured` / `normalizing` / `normalized` / `failed`) — a dedicated `'withdrawn'` value would require
an `ALTER TYPE` **migration, which this slice forbids (no migration)**, so we reuse the existing
`'failed'` terminal value. The proof is consent-hidden by the resolver regardless, so the status is
**honest-but-cosmetic** — its only job is that no media proof lingers in a non-terminal `normalizing`
state. (A dedicated `'withdrawn'` enum value, for audit clarity, is deferred to a future migration —
out of scope.)

**Predicate parity (F5).** The worker's `<effective-consent-granted predicate>` MUST be **identical**
to the app's `effectiveConsentState` / `effectiveConsentGranted` in `src/db/queries.ts` (latest
consent row by `version`, `state = 'granted'`). Because the worker is a separate package and cannot
import `queries.ts`, the two are a **canonical pair**: each location carries a cross-reference comment
naming the other, so a future change to one flags the other. A drift here is a P-VII correctness bug.

**Why atomic beats procedural**: it removes the race entirely (DB-enforced at write time) rather than
narrowing it, and it makes the worker's output genuinely subject to the cascade. Rejected:
(B) delete-original-only — leaves a narrow mid-encode residual; (C) periodic reconcile sweep — a new
moving part, over-engineered for this tier (the F2 delete-if-withdrawn-on-access hook is the cheap
reconcile we *do* ship; a full sweep stays future hardening).

---

## D7 — RESOLVED → reuse the account-scoped token (separate per-bucket token = future hardening)

**Decision (recommended)**: Reuse the **existing R2 API token** if it is account-scoped (can read/
write both buckets) — the app + worker keep their current `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`
and only gain `R2_CAPTURES_BUCKET` (the bucket *name*). Simplest: one credential set, two bucket
names.

**Alternative (hardening)**: Mint a **separate token scoped to the private bucket** (least-privilege;
a leaked public-bucket token can't touch customer media, and vice-versa). Cost: a second credential
set in three places.

**Recommendation**: Same token for this slice (simplest, unblocks the live walk); note separate-token
as a documented future hardening. Flagged for Cornel's call at provisioning. Grounding: the existing
token already accesses the single bucket; whether it is account-scoped or bucket-scoped determines
whether a new token is *required* — Cornel confirms at provisioning.

---

## D8 — No migration, no backfill (verified)

**Decision**: **No schema migration** — `proof.mediaUrl` + `proof.normalized_media_url` already exist
(text) and now simply hold keys. **No backfill code** — verified against the live DB: **15 proofs, 0
with `mediaUrl`, 0 public-URL values, 0 normalized**. All 15 are seeded fixtures (`mediaUrl` null); no
live `/c` capture has persisted media yet.

**Rationale**: There is nothing to convert. Planning/implementation should **re-verify the count**
immediately before shipping (a dev capture could create a row in the interim); if any live proof
*does* hold a public URL by then, it would point at the OLD public bucket — convert `mediaUrl` to a
key AND note the object physically lives in the public bucket (decide per-case: move it to captures,
or delete it as pre-fix test data). Given the current count is 0, the recommended handling is a
**verification step only, no backfill code**.

---

## Summary of decisions

| # | Decision | Status |
|---|----------|--------|
| D1 | Separate buckets (Q1 = A) | Resolved |
| D2 | `r2.ts` two-config split + named captures helpers | Resolved |
| D3 | Capture stores the key (action only; page untouched) | Resolved |
| D4 | Worker = captures-bucket routing + key fetch; encode unchanged | Resolved |
| D5 | Withdrawal hard-deletes both objects in the data layer | Resolved |
| D6 | Normalize-after-withdrawal race → **atomic conditional `markNormalized`** (A, made atomic); 0-row → delete-own-output, terminal `media_status='failed'` (reuse existing enum — no migration); predicate parity with `effectiveConsentState` | **RESOLVED → A (atomic)** |
| D7 | Same R2 token for both buckets (account-scoped) | **RESOLVED → reuse** (separate per-bucket token = future hardening) |
| D8 | No migration, no backfill (0 live media rows) | Resolved (re-verify count at ship) |
