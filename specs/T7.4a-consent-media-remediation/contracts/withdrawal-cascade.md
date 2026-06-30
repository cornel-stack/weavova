# Contract — Withdrawal cascade to the file (P-VII)

The P-VII fix: consent withdrawal destroys the customer's media object, not just the app surface.

## Where

`src/db/queries.ts` → `recordConsentWithdrawal(workspaceId, proofId)` — **additive** change. The
cascade lives in the **data layer** (not the action) so every withdrawal caller — the current
consent action and any future bulk/API path — cascades to the file and cannot be bypassed at the UI
(P-VII: "enforced in data, not just UI").

## Sequence

```
recordConsentWithdrawal(workspaceId, proofId):
  1. (existing) re-check effective grant; if not granted → { status: 'not_granted' }   ← no change
  2. (existing) insert consent{ state:'revoked', version: max+1 }                       ← authoritative
  3. (NEW) read proof.media_url (key) + proof.normalized_media_url (key) for proofId
  4. (NEW) if media_url present          → deleteCaptureObject(media_url)
  5. (NEW) if normalized_media_url present → deleteCaptureObject(normalized_media_url)
  6. return { status: 'recorded', version }
```

## Rules

- **Ordering**: the `revoked` consent version is written FIRST (authoritative — app surfaces gate on
  effective consent immediately, even if a delete errors). Deletes run AFTER.
- **Hard delete** (FR-008): the media objects are destroyed. The **consent record is retained** for
  audit (the `revoked` version + full history) — the media is what's removed, not the record.
- **Idempotent / no-media safe** (FR-009): a text proof (both keys null) → no delete, no error;
  deleting an already-absent object (re-withdrawal, prior delete) → success no-op
  (`deleteCaptureObject` treats 404 as success).
- **Failure handling**: a delete is awaited; a transient R2 error is logged but does **not** fail the
  withdrawal (consent stays revoked → surfaces gated). Because delete is idempotent, a re-withdrawal
  or a future sweep reconciles. The withdrawal return value is unchanged
  (`{ status: 'recorded' | 'not_granted'; version? }` — the delete does not add an `error` state;
  a transient delete failure is logged, not surfaced in the return).
- **Orphan race (FR-010)** — see research **D6** (flagged): an in-flight normalize completing after
  withdrawal must not leave a normalized object. Recommended: the worker re-checks effective consent
  before writing the normalized object (option A); fallback: withdrawal's delete of the captured
  original makes the in-flight `getObject` 404 → normalize fails cleanly (option B).

## P-VII proof (the acceptance)

After `recordConsentWithdrawal` for a proof with media: a `presignCaptureRead(media_url)` (or any
fetch of either object) resolves to **not available** (the object is gone), while
`getConsentHistory(proofId)` still returns the full version timeline including the `revoked` version.
The cascade reached the file.

## Cores untouched

The consent schema, the `revoked`-version model, the resolver, and `getConsentHistory` are unchanged.
The only change is the additive delete step inside `recordConsentWithdrawal`. The consent **action**
(`src/app/app/consent/actions.ts`) is unchanged (it calls the same function; the cascade is intrinsic
to the function).
