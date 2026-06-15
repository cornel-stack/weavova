// Reusable cold-start retry wrapper for Neon DB reads (T2.1). Neon free-tier
// databases sleep when idle; the first query after idle can fail transiently
// while the compute wakes. This retries ONLY those transient connectivity
// failures and rethrows deterministic errors immediately, so a real bug or a
// missing DATABASE_URL surfaces at once instead of looping. The whole spine
// (T2.2+) wraps its reads with this so the policy lives in one place.

export type DbRetryOptions = {
  /** total attempts, not extra retries (default 3) */
  attempts?: number;
  /** first backoff step in ms; grows per attempt (default 250) */
  baseDelayMs?: number;
};

// Conservative allowlist of transient connectivity / cold-start signals.
const TRANSIENT_SIGNALS = [
  "fetch failed",
  "econnreset",
  "econnrefused",
  "etimedout",
  "enotfound",
  "connection terminated",
  "connection closed",
  "socket hang up",
  "timeout",
  "network",
  "502",
  "503",
  "504",
];

/** True only for transient connectivity/cold-start errors that are worth retrying. */
export function isTransientDbError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  // Deterministic config error from getDb() — never retry; surface immediately.
  if (err.message.includes("DATABASE_URL is not set")) return false;
  const cause = (err as { cause?: unknown }).cause;
  const haystack = `${err.name} ${err.message} ${String(cause ?? "")}`.toLowerCase();
  return TRANSIENT_SIGNALS.some((signal) => haystack.includes(signal));
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `operation`, retrying transient DB failures up to `attempts` times with
 * a short fixed backoff. Non-transient errors (and the final attempt) rethrow
 * the original error unchanged — callers' error boundaries handle it. Never
 * logs the error or the connection string.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  opts: DbRetryOptions = {},
): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 250;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      if (attempt >= attempts || !isTransientDbError(err)) throw err;
      // fixed backoff: 250ms, 750ms, … (no jitter needed for a single-user demo)
      await sleep(baseDelayMs * (attempt * 2 - 1));
    }
  }

  throw lastError;
}
