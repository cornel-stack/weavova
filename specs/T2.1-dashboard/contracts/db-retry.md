# Contract — `withDbRetry` (reusable cold-start retry wrapper)

**Location**: `src/db/with-retry.ts`. Reusable by every spine read (T2.2 inbox, T2.3 detail, …). It is
the single place the transient-retry policy lives.

## Signature (intended)

```ts
export type DbRetryOptions = {
  attempts?: number;     // default 3 (total tries, not extra retries)
  baseDelayMs?: number;  // default ~250ms; backoff grows per attempt
};

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  opts?: DbRetryOptions,
): Promise<T>;
```

## Behaviour contract

- **Runs `operation()`**; on a **transient** error, waits a short backoff and retries, up to `attempts`
  total tries. On success returns the result.
- **Transient classifier** (`isTransientDbError(err): boolean`): returns `true` only for
  connectivity/cold-start signals from the Neon HTTP driver — network/`fetch failed`, connection
  terminated/reset, timeouts, HTTP 5xx. Returns `false` for everything else, including:
  - SQL / syntax / constraint errors (deterministic — a real bug),
  - the `DATABASE_URL is not set` error from `getDb()` (config — must surface immediately).
  Unknown errors default to **non-transient** (fail fast).
- **Backoff**: short fixed steps derived from `baseDelayMs` (e.g. ~250ms, ~750ms). Bounded total so a
  genuine outage surfaces an error promptly rather than hanging (SC-005). No randomness/jitter.
- **On exhaustion or a non-transient error**: rethrows the original error (so the caller's error
  boundary handles it). Adds no sensitive data to the message; never logs the connection string.
- **Purity**: no global state; safe to wrap any `() => Promise<T>` DB read.

## Usage in this slice

- `getDashboardSummary` wraps its DB work in `withDbRetry(...)`.
- `getDefaultWorkspace` (consumed by the T1 `getCurrentWorkspace` seam, unchanged) wraps its read so the
  layout's workspace fetch is cold-start hardened too. The seam (`src/lib/session.ts`) is **not** edited.
