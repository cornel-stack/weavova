# Phase 1 — Data Model: T7.4a Consent-Media Remediation

**No schema migration.** The relevant columns already exist (T7.4); this slice changes the **value
form** stored in them (key, not URL) and the **bucket** their objects live in. No new tables, enums,
or columns.

## Object classes (the consent boundary = the storage boundary)

| Class | DB reference | Form (after this slice) | Bucket | Access | Consent-bearing |
|-------|--------------|-------------------------|--------|--------|:---:|
| **Captured customer media** | `proof.media_url` | **key** `capture/{ws}/{uuid}.{ext}` | PRIVATE captures | `presignCaptureRead` only | ✅ |
| **Normalized customer media** | `proof.normalized_media_url` | **key** `capture/{ws}/{proofId}/normalized.{ext}` | PRIVATE captures | `presignCaptureRead` only | ✅ |
| **Brand asset** | `brand_asset.asset_url`, `brand_kit.logo_asset_url` | public URL (`assetUrlForKey`) | PUBLIC brand | direct public URL (unchanged) | ❌ |
| **Consent record** | `consent` (versioned) | — | — | — | the trigger; **retained for audit** |

### Field-form change (no migration)

- `proof.media_url`: was a **public URL** (`assetUrlForKey(key)`); becomes the **raw key**. The
  column type (text, nullable) is unchanged; the schema comment already says "the captured
  source-media R2 key" — the value now matches.
- `proof.normalized_media_url`: already a **key** (T7.4); unchanged in form, now explicitly in the
  captures bucket.
- No change to `brand_asset.asset_url` / `brand_kit.logo_asset_url` (stay public URLs).

## Environment (the only "schema" change is env)

| Var | App (Vercel) | Worker (Railway) | Purpose | Status |
|-----|:---:|:---:|---------|--------|
| `R2_BUCKET` | ✅ | — (app only) | PUBLIC brand-assets bucket name | existing, unchanged |
| `R2_PUBLIC_BASE_URL` | ✅ | — | public base URL for brand assets | existing, unchanged |
| `R2_CAPTURES_BUCKET` | ✅ | ✅ | **NEW** PRIVATE customer-media bucket name (no public domain) | **ADD** |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | ✅ | ✅ | R2 account + creds (one token covers both buckets — D7) | existing |

The worker drops its use of `R2_BUCKET` and uses `R2_CAPTURES_BUCKET` (it only ever touches customer
media). The app uses both bucket names (public for brand, captures for customer media).

## State flow — withdrawal cascade (P-VII at the file layer)

```
withdraw consent (proofId)
  └─ recordConsentWithdrawal:
       1. insert consent{ state:'revoked', version:n+1 }      ← authoritative; consent RECORD retained
       2. read proof.media_url (key), proof.normalized_media_url (key)
       3. deleteCaptureObject(media_url)        ← BEST-EFFORT hard delete, PRIVATE bucket (idempotent)
       4. deleteCaptureObject(normalized_media_url)
       (transient R2 failure → logged, NOT surfaced; still returns 'recorded')
  └─ (D6, ATOMIC) in-flight normalize's markNormalized is a consent-gated conditional UPDATE →
       0 rows when withdrawn → worker deletes its own normalized output → no orphan (no race window)
  └─ (FR-007a reconcile) delete-if-withdrawn-on-access: presignCaptureRead (forward-contract, no live
       reader this slice) + re-withdrawal re-issue the idempotent delete; full sweep = future hardening
RESULT: consent gate 100% immediate (resolver hides proof; history intact, auditable) ·
        media OBJECTS destroyed on successful delete · transient-failure residual closed by reconcile
```

## State flow — normalize lifecycle (unchanged except bucket + key input)

```
media.captured{ mediaKey = proof.media_url = KEY }
  └─ getObject(KEY) from PRIVATE captures bucket   ← was broken (received a URL); now correct
  └─ normalize encode (UNCHANGED)
  └─ putObject(normalizedKey) to PRIVATE captures bucket
  └─ markNormalized = ATOMIC conditional UPDATE:
        UPDATE proof SET normalized_media_url=normalizedKey, media_status='normalized'
         WHERE id=:proofId AND <effective-consent-granted>      ← predicate-parity with queries.ts (F5)
       ├─ 1 row → persisted (consent held through the write)
       └─ 0 rows → consent withdrawn mid-normalize → deleteObject(normalizedKey) +
                   media_status='failed' (terminal; reuse existing enum — NO migration); URL NOT saved
  └─ FAILURE (encode/fetch) → media_status='failed', original retained, no normalized (T7.4 contract)
```

**Predicate parity (F5).** The worker's `<effective-consent-granted>` (the WHERE clause above) and the
app's `effectiveConsentState` / `effectiveConsentGranted` in `src/db/queries.ts` are a **canonical
pair** — identical rule (latest consent row by `version`, `state='granted'`). The worker is a separate
package and cannot import `queries.ts`, so each location MUST carry a cross-reference comment naming
the other; a drift between them is a P-VII correctness bug.

## (Non-)backfill

Verified live: **15 proofs, 0 with media, 0 public-URL values, 0 normalized** → **no backfill code**.
Re-verify the count immediately before ship (a dev capture could add a row); if any live proof holds
a public URL by then, convert `media_url` → key and note its object is in the OLD public bucket
(per-case: migrate to captures or delete as pre-fix test data). Current reality: a verification step
only.

## Invariants

- Consent-bearing media is **never** persisted or surfaced as a permanent public URL (FR-003) —
  enforced structurally: it lives only in the no-public-domain captures bucket.
- `assetUrlForKey` / brand path is **unchanged** (FR-014) — targets the public bucket only.
- Withdrawal **destroys the media object** but **retains the consent record** (FR-008).
- No new app dependency; app stays at 11 runtime deps (FR-016).
