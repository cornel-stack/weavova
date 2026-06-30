# Contract — `r2.ts` two-bucket routing

The single place bucket routing lives. Two object classes, two access models, **no cross-routing**
(named helpers per class — no `bucket` flag to misuse). Reuses one `aws4fetch` SigV4 client (no new
dep). All config read **lazily** (build green without credentials; a missing var throws only when the
helper is actually called).

## Config

```ts
// PUBLIC brand-assets bucket (UNCHANGED — today's getConfig)
function getPublicConfig(): { accountId; accessKeyId; secretAccessKey; bucket; publicBaseUrl }
//   ← R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL

// PRIVATE customer-media bucket (NEW — no publicBaseUrl)
function getCapturesConfig(): { accountId; accessKeyId; secretAccessKey; bucket }
//   ← R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_CAPTURES_BUCKET
//   (same account + creds as public — D7; one token covers both buckets)
```

## PUBLIC helpers (brand) — UNCHANGED behaviour

```ts
assetUrlForKey(key): string            // R2_PUBLIC_BASE_URL + key — public, permanent (brand only)
presignPut(key, contentType): string   // signed PUT to the PUBLIC bucket (brand/footage/logo)
brandAssetKey(ws, suffix): string      // key builders — unchanged
brandKitLogoKey(ws, suffix): string
```

Callers (UNCHANGED, regression-guarded): `src/app/app/footage/actions.ts`,
`src/app/app/brand/actions.ts`. `assetUrlForKey` cannot address the captures bucket (it has no public
base URL) → customer media can never become a public URL.

## PRIVATE helpers (captures) — NEW

```ts
captureMediaKey(ws, suffix): string                 // UNCHANGED builder (capture/{ws}/{suffix});
                                                     // objects now live in the CAPTURES bucket
presignCaptureUpload(key, contentType): Promise<string>  // signed PUT to the CAPTURES bucket
presignCaptureRead(key): Promise<string>            // signed, EXPIRING GET — the ONLY customer-media read
deleteCaptureObject(key): Promise<void>             // HARD DELETE from the captures bucket; idempotent
```

- `presignCaptureUpload` replaces `presignPut` **only** in the capture action (`/c/[token]`).
- `presignCaptureRead` TTL = the existing `PRESIGN_TTL_SECONDS` (300s); signs a GET. No public URL is
  ever produced for customer media.
- `deleteCaptureObject` issues an S3 `DELETE`; a 404 (already-absent) resolves as success (idempotent).

## Routing table (the invariant)

| Operation | Helper | Bucket |
|-----------|--------|--------|
| Brand/logo/footage upload | `presignPut` | PUBLIC |
| Brand/logo/footage URL | `assetUrlForKey` | PUBLIC |
| Capture upload | `presignCaptureUpload` | PRIVATE |
| Capture/normalized read | `presignCaptureRead` | PRIVATE |
| Withdrawal delete | `deleteCaptureObject` | PRIVATE |
| Worker normalize get/put/delete | worker `getObject`/`putObject`/`deleteObject` | PRIVATE (`R2_CAPTURES_BUCKET`) |

**Guard**: there is no code path by which brand media reaches the private bucket or customer media
reaches the public bucket — the helpers are class-named and each binds one config.
