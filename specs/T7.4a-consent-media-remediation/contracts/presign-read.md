# Contract — Mediated read (presigned-GET) for customer media

Establishes the **only** sanctioned way to read consent-bearing customer media. This slice adds the
helper + locks the pattern; it does **NOT** build playback (that is T8). The T7.2 non-playing seam is
unchanged.

## The helper

```ts
// src/lib/r2.ts
presignCaptureRead(key: string): Promise<string>
//   signs a short-lived (PRESIGN_TTL_SECONDS = 300s) GET against the PRIVATE captures bucket.
//   Returns a time-limited URL — NEVER a permanent public URL. The bucket has no public domain,
//   so this signed URL is the ONLY way to fetch a captures object.
```

## Rules

- **Mediated + expiring** (FR-011): every read of customer media goes through `presignCaptureRead`;
  the returned URL expires. There is no permanent public URL for customer media anywhere.
- **Gateable on consent** (FR-012): the helper signs a URL for a given key but does **not** itself
  read the DB. The sanctioned pattern is that the **caller** (future T8 playback) first resolves the
  proof's effective consent (the existing resolver) and only then calls `presignCaptureRead`. The
  helper does not bypass consent because nothing reaches it without a consent-gated caller. (This
  slice has **no** caller — see below.)
- **No playback built** (FR-013): the proof-detail media region (`proof-detail-media.tsx`) is
  **byte-stable** — it still renders the honest non-playing seam ("video stored · playback coming"),
  no `<video>`, no `<img>`, no playback control. `presignCaptureRead` has **no live consumer** in
  this slice; it is forward-contract plumbing for T8.

## Why establish it now

It locks the correct read architecture so T8 cannot re-introduce a public-URL read: with the captures
bucket private, the *only* readable form is a signed, expiring URL produced by this helper, behind a
consent gate. The mistake the T7.4 trace found (a permanent public URL) is now structurally
impossible to repeat.

## Acceptance

- `presignCaptureRead(key)` returns a URL that (a) fetches the object while valid and (b) is rejected
  after its TTL — never a permanent public URL.
- The proof-detail media seam renders 0 playback elements (unchanged).
- There is no code path that surfaces a permanent public URL for customer media.
