# Quickstart — Validate T7.4a Consent-Media Remediation

The build/typecheck stay green without the new bucket; the live paths verify with the provisioned
private bucket (the T6 verify-with-real-infra pattern). No migration, no backfill.

## Prerequisites

- A SECOND R2 bucket (private, **no public domain**) provisioned; `R2_CAPTURES_BUCKET` set on app
  (`.env.local`), Vercel, and the Railway worker. Existing `R2_*` + `R2_PUBLIC_BASE_URL` unchanged.
- (D7) The existing R2 token can access both buckets, or a separate captures token is set.

## Build gate (no infra needed)

```bash
npm run lint && npm run build      # app green; deps still 11 (no new dep)
cd worker && npm run build         # worker green (now reads R2_CAPTURES_BUCKET)
```

## Scenario 1 — Capture stores a KEY (US2 / SC-001)

- Capture a video at `/c/[token]` → inspect the new `proof`: `media_url` is a **key**
  (`capture/{ws}/{uuid}.webm`), **not** an `http…` URL. The `/c` page UI is unchanged.
- **Verify**: `select media_url from proof where … ` → matches `^capture/` (no `http`). SC-001.

## Scenario 2 — Worker fetch works + normalizes (US2 / SC-003)

- The `media.captured` event carries the **key**; the worker `getObject(key)` fetches from the
  captures bucket successfully (previously broken on real data), normalizes, and writes
  `normalized_media_url` = a key in the captures bucket; `media_status='normalized'`, original
  retained.
- Corrupt input → `media_status='failed'`, original retained, no normalized (T7.4 contract). SC-003.

## Scenario 3 — Withdrawal destroys the file (US1 / SC-002 — the P-VII proof)

- For a proof with media: confirm both objects are fetchable via `presignCaptureRead` (signed).
- Withdraw consent for that proof.
- **Verify**: a fetch of either object (captured + normalized) now returns **not available** (the
  objects are gone from the captures bucket), while `getConsentHistory(proofId)` still returns the
  full timeline including the `revoked` version. SC-002. **This is the P-VII proof.**
- Text proof (no media) withdrawal → no error (idempotent no-op).

## Scenario 4 — Mediated read only; non-playing seam unchanged (US3 / SC-005, SC-006)

- `presignCaptureRead(key)` returns a time-limited URL that fetches while valid and is rejected after
  its TTL; there is **no** permanent public URL for customer media. SC-006.
- The proof-detail media region renders the unchanged non-playing seam — 0 `<video>`/`<img>`/playback
  controls. SC-005.

## Scenario 5 — Brand assets unchanged (US4 / SC-004)

- Render a brand logo / brand-kit image / brand footage card → loads from its public URL exactly as
  before (public bucket, `assetUrlForKey` untouched). 0 regressions. SC-004.

## Gate checks

- **Cores frozen (SC-008)**: `git diff` shows 0 edits to `src/app/c/[token]/page*`, the
  `capture_request` token model, and `src/lib/verification.ts`.
- **Deps unchanged (SC-007)**: app `package.json` still 11 runtime deps; no new dependency.
- **No-public-URL (SC-006)**: grep confirms `assetUrlForKey` is never called on a capture key; the
  capture action persists the key, not `assetUrlForKey(...)`.

## Pass criteria → Success Criteria

SC-001 → Scenario 1 · SC-002 → Scenario 3 (P-VII proof) · SC-003 → Scenario 2 · SC-004 → Scenario 5 ·
SC-005/006 → Scenario 4 · SC-007 → build gate · SC-008 → gate checks.
