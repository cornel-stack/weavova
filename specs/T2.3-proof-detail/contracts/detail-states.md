# Contract — proof-detail states (loading / not-found / error)

**Location**: `src/app/app/proof/[id]/` route segment. Three **distinct** mechanisms for three distinct
meanings; the not-found path is the tenant-isolation surface and MUST be oracle-safe.

## The three states (distinct files, distinct semantics)

| State | Mechanism | Renders | Meaning |
|---|---|---|---|
| **Loading** | `loading.tsx` (Server) + the page's `<Suspense fallback={<ProofDetailSkeleton/>}>` | `<ProofDetailSkeleton/>` (token-only, layout-preserving) | the read is in flight (incl. a transparent cold-start retry) |
| **Not-found** | `notFound()` (called in `proof-detail-data.tsx` when `getProof` returns `null`) → `not-found.tsx` (Server) | `<ProofDetailNotFound/>` (honest copy + back-to-inbox link), inside AppChrome | the id does not exist **or** is not in this workspace — an expected 404, **not** an error |
| **Error** | `error.tsx` (`"use client"`, page-segment boundary) catching a throw past `withDbRetry` | shared `<ErrorState onRetry={reset}/>`, inside AppChrome | a genuine read failure; `reset()` re-runs the **detail** read |

- All three render **inside** the persisting AppChrome (rail + top bar stay).
- The root `app/error.tsx` (T2.1) still covers a failure of the **layout's** workspace read (unchanged).
- The T2.2 inbox `app/app/proof/error.tsx` is unrelated; `[id]` has its **own** `error.tsx` so `reset()`
  scopes to the detail, not the inbox.

## Distinctness contract (FR-012)

- **Not-found ≠ error.** Not-found is reached by `notFound()` (a 404 control-flow signal), never by
  throwing; the error boundary is reached only by a thrown read failure. The two never share a surface and
  are never confused. Not-found shows no retry framed as "something went wrong"; error shows no "not found".

## No-existence-oracle contract (US3 / SC-005)

- `getProof` returns `null` for **both** "id does not exist" and "id exists in another workspace" → both
  call `notFound()` → the **same** `not-found.tsx` output (same copy, same 404 status). An observer cannot
  distinguish the two cases.
- The not-found surface renders **zero** bytes of the requested/other proof: no name, words, source,
  consent, or metadata. No raw error text, stack, digest, or DB detail anywhere (reusing `<ErrorState>`'s
  no-raw-text guarantee on the error path).

## Reuse (unchanged from T2.1/T2.2)

- `withDbRetry` wraps the `getProof` read (transparent cold-start recovery behind the skeleton).
- `<ErrorState>` (`src/components/app/error-state.tsx`) is the error UI — reused as-is, no raw error text.
- The Suspense + `loading.tsx` skeleton pattern mirrors the dashboard/inbox.
