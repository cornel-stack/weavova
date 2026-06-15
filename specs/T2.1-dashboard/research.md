# Phase 0 — Research: T2.1 Dashboard

All Technical Context is fixed by the locked stack (Principle III); no language/framework unknowns.
This file records the design decisions the spec deferred to the plan. No `NEEDS CLARIFICATION` remain.

## R1 — Loading mechanism (how the skeleton shows during a cold-start read)

- **Decision**: Render the masthead scaffold in the Server page, then wrap the data-dependent body in
  `<Suspense fallback={<DashboardSkeleton/>}>` around an async Server child (`DashboardBody`) that
  performs the read. Also add `app/app/loading.tsx` rendering the same skeleton for client navigations
  into `/app`.
- **Rationale**: With `<Suspense>`, the chrome + skeleton stream as soon as the layout resolves, and
  the resolved dashboard streams in when the read (including retries) completes — the user sees a
  loading state rather than a stalled blank page (FR-011). The retry happens server-side inside the
  suspended render, so cold starts stay invisible until exhaustion.
- **Alternatives rejected**: A single top-level `await getDashboardSummary()` in `page.tsx` — blocks
  the entire page on the DB with no skeleton, defeating FR-011 on a cold start. `loading.tsx` alone —
  mainly helps client navigations; pairing it with the in-page Suspense covers the first load too.
- **Known boundary**: `app/app/layout.tsx` (T1) `await`s `getCurrentWorkspace` before children, so the
  skeleton streams only after the (retry-hardened) workspace read resolves. Acceptable: that read is
  cheap/warm in the normal case and transient-hardened in the cold case.

## R2 — Transient-vs-genuine error classification

- **Decision**: A centralized classifier in `with-retry.ts` decides whether an error from the Neon HTTP
  driver is **transient** (retry) or **genuine** (rethrow immediately). Transient = connectivity /
  cold-start signals: `fetch failed`/network errors, connection terminated/reset, timeouts, and HTTP
  5xx from the driver. Genuine = SQL/syntax/constraint violations and the explicit
  `DATABASE_URL is not set` thrown by `getDb()`.
- **Rationale**: Retrying a deterministic error (bad SQL, missing env) just delays a guaranteed failure
  and hides bugs. Cold starts manifest as connectivity/timeout errors, which are exactly what should be
  retried (FR-013).
- **Implementation note**: classify by inspecting `error.name`/`message`/`cause` (and `status`/`code`
  when present) with a small allowlist of transient signals; default to **non-transient** when unsure
  (fail fast, surface the error) — conservative so we never loop on a real bug.
- **Alternatives rejected**: "retry everything N times" (masks real errors, slow failures); relying on
  a driver-native retry option (the `neon-http` driver does not give us the transient/loading semantics
  the spec wants, and we need one reusable policy for the whole spine).

## R3 — Retry policy

- **Decision**: default `attempts: 3` with short fixed backoff (~250ms, then ~750ms), small total
  budget (well under a couple of seconds added); rethrow the last error on exhaustion.
- **Rationale**: Enough to ride out a Neon wake-up without making a genuine outage feel like a hang
  (SC-005). Fixed steps (no jitter/randomness) are sufficient for a single-user demo and keep the
  helper pure and deterministic.
- **Alternatives rejected**: exponential backoff with jitter (over-engineered here); unbounded retry
  (would hang the error path).

## R4 — Greeting time-of-day source

- **Decision**: Compute morning/afternoon/evening from **server time** at render (A-05). The user's
  first name comes from the session seam (`getSession`).
- **Rationale**: Keeps the greeting a Server Component (P-X) — it is display, not interaction. A small
  server/local-time skew is acceptable for a demo.
- **Alternatives rejected**: a client island to read the browser's local time — adds a Client component
  for a non-interactive nicety; not justified now. Noted as a deferred refinement.

## R5 — Inert affordances (present-but-not-yet-wired)

- **Decision**: "Request proof" (masthead) and the hero "Make a clip" are `<button type="button">`
  elements with no handler — they look like the primary action, are keyboard-focusable, and do nothing
  (never error — FR-010, FR-007). "View all in the inbox →" is an `<a href="/app/proof">` to the
  existing T1 placeholder route (non-erroring).
- **Rationale**: Honours the port (the affordances are visible) without building the request flow / clip
  studio / inbox (scope, P-IX/XI). Plain elements need no client JS, keeping the page Server.
- **Alternatives rejected**: wiring to not-yet-built routes (would 404/error); disabling the buttons
  (misrepresents the design — they are primary actions, not disabled states).

## R6 — Assembling the summary in "one read"

- **Decision**: `getDashboardSummary(workspaceId)` issues a **counts aggregate** (all workspace proof)
  plus **one ordered, `limit N+1` fetch** for hero+recent, both inside a single `withDbRetry` boundary;
  clip fields are constants (`0`/`null`) with `// T2.4` swap markers.
- **Rationale**: Counts must span all proof (can't come from a limited page), and the hero/recent list
  is naturally one ordered+limited query reusing the existing `proofColumns`/`toView`. Two small scoped
  queries behind one retry boundary is the readable "one read".
- **Alternatives rejected**: a single window-function mega-query (less readable, no real benefit at ~15
  rows); fetching all proof then counting in JS (wasteful and not workspace-bounded at the DB).
