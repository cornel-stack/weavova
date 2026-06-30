# Implementation Plan: T7.4a — Consent-Media Remediation

**Branch**: `T7.4a-consent-media-remediation` | **Date**: 2026-06-30 | **Spec**:
[spec.md](./spec.md)

**Input**: Feature specification from `specs/T7.4a-consent-media-remediation/spec.md`

## Summary

Close the P-VII consent-media gap found by the T7.4 trace. Make **consent-bearing customer media**
(captured + normalized proof media) **structurally private** by routing it to a NEW private R2
bucket with **no public domain**, while leaving **brand assets** on the existing public bucket
untouched. Concretely: (1) the capture write-path persists the storage **key** (not a public URL);
(2) the normalize worker — currently broken on real data because it was handed a URL where a key was
expected — now fetches by key from the private bucket; (3) **consent withdrawal hard-deletes** the
captured + normalized objects (the cascade reaches the file, not just the app); (4) a presigned-GET
helper establishes the *only* sanctioned read path for customer media (the path T8 playback will
use — no playback is built here; the T7.2 non-playing seam stays). Q1 resolved → **A (separate
buckets)**: a private bucket makes customer media private *by construction*, not by obscurity.

**No migration** (the `proof.mediaUrl` / `proof.normalized_media_url` columns already exist and just
hold keys now). **No backfill** (verified: 0 live proofs hold media — all 15 rows are seeded
fixtures with `mediaUrl` null). **No new dependency** (presign/delete reuse the existing `aws4fetch`
path; the app stays at 11 runtime deps). Cores frozen except an enumerated touch list.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 15 (App Router), React 19; the worker is a
separate Node 22 package (T7.4).

**Primary Dependencies**: Drizzle + Neon (existing), Cloudflare R2 via `aws4fetch` (existing — the
*only* signing path; no new dep). Inngest is **not** required for this slice's primary mechanism
(withdrawal-delete runs app-side on existing infra).

**Storage**: Cloudflare R2 — **two buckets after this slice**: the existing PUBLIC brand-assets
bucket (`R2_BUCKET`, public via `R2_PUBLIC_BASE_URL` / media.weavova.com) and a NEW PRIVATE
customer-media bucket (`R2_CAPTURES_BUCKET`, **no public domain**, presigned-GET reads only).

**Testing**: No test runner in the demo tiers — validation = quickstart scenarios + explicit gates
(grounded by direct DB/R2 checks, the T7.4 pattern).

**Target Platform**: Vercel (app) + Railway (worker), both on the shared Neon DB + the two R2
buckets.

**Project Type**: Web application (Next.js app) + a separate Railway worker package.

**Performance Goals**: N/A (storage/consent plumbing; presign latency is negligible).

**Constraints**: Cores frozen (P-V): the capture token model, the T7.5 resolver
(`verification.ts` / `qualifyingBasisExpr`), the `/c/[token]` **page** UI, and the
`capture_request` primitive are UNCHANGED. App stays at **11** runtime deps. The worker change is
**bucket routing + key-fetch + a delete primitive**; normalize encode logic is otherwise unchanged.

**Scale/Scope**: ~6 source files + env/runbook. No schema migration, no backfill code, no new UI.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Customer is the headline (P-II)**: N/A to layout — no proof-display surface changes.
      Indirectly the strongest possible respect for the customer: their footage becomes genuinely
      removable.
- [x] **Locked stack (P-III)**: only the locked stack — R2 via `aws4fetch`, Drizzle/Neon, the
      Railway worker. **No new dependency**; the second bucket is config, not a library. Heavy render
      stays off Vercel (unchanged).
- [x] **Pressroom tokens (P-IV)**: N/A — no UI changes (the non-playing seam is byte-stable).
- [x] **Port, don't redesign (P-V)**: no UI designed. Cores frozen; the only enumerated touch points
      are storage/consent plumbing (§ Cores frozen). The non-playing proof-detail media seam is
      unchanged.
- [x] **Fixtures-first (P-VI)**: the key form matches the schema's stated contract; seeded fixtures
      store no media, so they are unaffected; no migration (columns already exist).
- [x] **Consent enforcement (P-VII) — CENTRAL**: revocation now **cascades to the media file** (hard
      delete), not just the app surface. Consent stays visible/versioned/revocable; the consent
      record is retained for audit while the media object is destroyed. Enforced in the data-layer
      withdrawal function, not just UI.
- [x] **No editor (P-VIII)**: N/A — no studio/format surface.
- [x] **SDD scope (P-IX)**: one remediation slice; fixes live/broken + establishes the private-read
      pattern; **no** T8 playback, no speculative work.
- [x] **Ambiguity handling (P-XII)**: the two implementation decisions were surfaced (not invented)
      and are now **resolved** in research.md — D6 (normalize-after-withdrawal race) → A made atomic;
      D7 (same vs separate token) → reuse the account-scoped token. The `/speckit-analyze` pass
      (F1–F6) reconciled spec/plan/tasks/data-model to the resolutions.
- [x] **Port-completeness (P-XIII)**: no dead controls; the presign-read helper is real plumbing, no
      playback control shown before T8; the non-playing seam stays honest.
- [x] **Owned data only (P-XIV)**: no fabricated state; `media_status` honesty + the failure contract
      preserved; deletion produces no fabricated success/failure.
- [x] **Plan-not-code (P-XV)**: N/A — non-render slice.
- [x] **No-LLM-in-render (P-XVI)**: N/A — non-render slice.

**Definition of done**: capture stores a key; the worker fetches by key from the private bucket and
normalizes; withdrawal hard-deletes both objects (P-VII proof: object unretrievable after); the
presign-read helper exists; brand assets render unchanged; app + worker build green; app deps still
11; cores byte-stable. Then STOP and report.

## Architecture — the two-bucket model

```
                         R2 account (one account)
        ┌───────────────────────────────┬───────────────────────────────────┐
        │  PUBLIC  brand-assets bucket    │  PRIVATE  customer-media bucket     │
        │  R2_BUCKET  (media.weavova.com) │  R2_CAPTURES_BUCKET  (NO public dom)│
        │  R2_PUBLIC_BASE_URL set         │  NO public base URL                 │
        ├───────────────────────────────┼───────────────────────────────────┤
        │  logos, brand-kit images,       │  captured proof media (capture/…)   │
        │  brand footage                  │  normalized proof media (capture/…) │
        │  → assetUrlForKey (public URL)  │  → presignCaptureRead (signed, TTL) │
        │  → presignPut (existing)        │  → presignCaptureUpload (PUT)       │
        │                                 │  → deleteCaptureObject (withdrawal) │
        │                                 │  → worker getObject/putObject/delete │
        └───────────────────────────────┴───────────────────────────────────┘
```

The split is **structural**: customer media lives only in a bucket with no public domain, so it
**cannot** be served by a permanent public URL — only via a signed, expiring `presignCaptureRead`.
`assetUrlForKey` is physically incapable of producing a customer-media URL (it targets the public
bucket's base URL, which the captures bucket does not have). Brand and customer paths cannot cross.

### Data flow after this slice

- **Capture**: `/c/[token]` action → `presignCaptureUpload(key)` (captures bucket) → browser PUTs
  bytes → action persists `proof.mediaUrl = key` (NOT `assetUrlForKey`).
- **Normalize (worker)**: `media.captured{ mediaKey = proof.mediaUrl = key }` → `getObject(key)`
  from captures bucket (now correct) → encode → `putObject(normalizedKey)` to captures →
  **atomic** `markNormalized` = a single conditional UPDATE (`SET normalized_media_url=…,
  media_status='normalized' WHERE id=:proofId AND <effective-consent-granted>`). **1 row** → done;
  **0 rows** (consent withdrawn mid-normalize) → `deleteObject(normalizedKey)` + terminal
  `media_status='failed'` (reuse existing enum — no migration), URL NOT persisted (D6 → A, atomic — no
  read-then-write window; the worker's own output is subject to the cascade). Failure contract
  preserved.
- **Withdrawal**: `recordConsentWithdrawal` writes the `revoked` consent version (authoritative),
  then **best-effort** `deleteCaptureObject(mediaUrl)` + `deleteCaptureObject(normalizedMediaUrl)`
  (idempotent hard delete). A transient R2 failure is logged, not surfaced — the withdrawal still
  returns `recorded` (consent record + resolver-hide are the authoritative gate). The cheap reconcile
  (FR-007a) is **delete-if-withdrawn-on-access** (wired into `presignCaptureRead`, forward-contract —
  no live reader this slice) + re-withdrawal idempotency; a full sweep is deferred hardening. Consent
  record retained; media object destroyed.
- **Read (future T8)**: the ONLY sanctioned path is `presignCaptureRead(key)` (signed, expiring),
  gateable on the resolver. This slice adds the helper; the non-playing seam stays.

## Phase 0 — Research

See [research.md](./research.md). Decisions D1–D8, all resolved. Q1 → A (separate buckets). **D6 →
A made atomic**: the normalize-after-withdrawal race is closed by an atomic consent-gated conditional
`markNormalized` UPDATE (0 rows → delete-own-output + terminal `media_status='failed'`, no migration),
not a procedural read-then-write — see research D6 + the `/speckit-analyze` F3/F4/F5 remediation. **D7 →
reuse** the account-scoped R2 token (separate per-bucket token = future hardening). No open
`[NEEDS CLARIFICATION]` remains.

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md) — the two object classes, the env additions, the (non-)migration
  + (non-)backfill statements, and the withdrawal-cascade state flow.
- [contracts/r2-bucket-routing.md](./contracts/r2-bucket-routing.md) — the `r2.ts` surface: which
  helper targets which bucket; the new captures helpers' signatures.
- [contracts/withdrawal-cascade.md](./contracts/withdrawal-cascade.md) — the delete primitive +
  the withdrawal cascade contract (ordering, idempotency, the orphan-race handling).
- [contracts/presign-read.md](./contracts/presign-read.md) — the mediated-read helper (the only
  sanctioned customer-media read) + the unchanged non-playing seam.
- [quickstart.md](./quickstart.md) — validation scenarios incl. the P-VII proof (object
  unretrievable after withdrawal) and the brand-asset regression guard.

## Cores frozen — enumerated (P-V)

UNCHANGED: `capture_request` token model (token/72h/single-use); `src/lib/verification.ts` +
`qualifyingBasisExpr`; the `/c/[token]` **page** UI; the consent schema; the normalize **encode**
logic; `assetUrlForKey` + the brand/footage/logo public path. **STOP-and-surface** if any of these
needs a real change.

TOUCHED (enumerated): `src/lib/r2.ts` (two-bucket config + captures helpers `presignCaptureUpload` /
`presignCaptureRead` / `deleteCaptureObject`; `assetUrlForKey` + `presignPut` stay public-bucket,
behaviour unchanged); `src/app/c/[token]/actions.ts` (captures-upload + persist the key — the
**action**, not the page); `src/db/queries.ts` `recordConsentWithdrawal` (additive delete cascade);
`worker/src/r2.ts` (`R2_BUCKET`→`R2_CAPTURES_BUCKET`, add `deleteObject`); env/runbook
(`R2_CAPTURES_BUCKET`). **Two confirmed worker touches (D6 → A, resolved — no longer conditional)**:
`worker/src/db.ts` (atomic `markNormalized` becomes a consent-gated conditional UPDATE returning a
row count + an `isConsentGranted`/predicate matching `src/db/queries.ts` `effectiveConsentState` — the
**canonical pair**, cross-referenced both ways per F5) and `worker/src/functions/media-captured.ts`
(0-row → `deleteObject(normalizedKey)` + terminal `media_status='failed'`, reusing the existing enum —
**no migration**). The normalize **encode** logic (`normalizeMedia`) is still unchanged.

## Provisioning delta (Cornel-owned — the T6 pattern; build green without)

- **Create a second R2 bucket** (private, **no** public domain / no r2.dev public URL) for customer
  media.
- **Set `R2_CAPTURES_BUCKET`** in three places: app `.env.local`, Vercel, Railway worker.
- **Credentials**: reuse the existing R2 API token if it is account-scoped (can access both
  buckets) — recommended for simplicity; or mint a separate token scoped to the private bucket
  (least-privilege). See research D7.
- The app + worker **build green without** the new bucket; the live path (capture→normalize→
  withdrawal-delete) is the verify-with-real-infra walk.

## Project Structure

```text
specs/T7.4a-consent-media-remediation/
├── plan.md              # this file
├── research.md          # Phase 0 — D1–D7 (2 flagged)
├── data-model.md        # Phase 1 — object classes + env (NO migration)
├── contracts/           # Phase 1 — r2-bucket-routing, withdrawal-cascade, presign-read
├── quickstart.md        # Phase 1 — validation + P-VII proof
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

## Complexity Tracking

No constitution gate fails. The one added structural element — a second R2 bucket — is the resolution
of Q1 (A) and is what makes the two-object-classes split *structural* (customer media has no public
path) rather than conventional. Provisioning cost (a second bucket + creds in three places) is the
accepted trade-off, captured in the provisioning delta + runbook.
