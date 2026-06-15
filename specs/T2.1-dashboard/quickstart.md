# Quickstart — Validate T2.1 Dashboard

A run/validation guide. Implementation details live in `plan.md` / `tasks.md`. This proves the slice
meets its acceptance criteria and Definition of Done.

## Prerequisites

- `.env.local` with a pooled Neon `DATABASE_URL`.
- Seed the demo workspace: `npm run db:seed`.
  - **Note (A-10)**: T2.1 does NOT change the seed. With the current absolute-dated fixtures the
    "this week" KPI may read low/zero depending on today's date — that is the expected honest behaviour
    (FR-004). The lively-demo fix (relative-date reseed) is a separate T0.3 task.

## Run

```bash
npm run dev        # http://localhost:3000/app
```

## Functional validation (acceptance criteria)

1. **Renders inside the shell (US1 / FR-001)**: `/app` shows the masthead (greeting + Request proof +
   KPI strip), the latest-proof hero, and the recent-proof grid — all inside the existing rail/top-bar
   chrome. The hero's customer quote/transcript (or media) is the largest element (P-II).
2. **Computed, not hardcoded (US2 / SC-002)**: in `src/db/seed.ts` flip one fixture's `reviewed`
   true↔false (or add/remove a fixture), re-run `npm run db:seed`, reload `/app` — the "needs review"
   KPI, the greeting count, and (for add/remove) the hero/grid change with no page-code edit.
3. **Real-date windows (FR-004)**: confirm "proof collected this week" matches proof with
   `capturedAt` in the trailing 7 days of the real current date; it is not anchored to the newest proof.
4. **Clip cells (US2 #5 / FR-005/005a)**: "clips made this month" reads **0**; the latest-clip slot
   shows its honest empty treatment; **no view/engagement number appears anywhere** (FR-019).
5. **Consent gate (SC-004 / FR-007)**: the hero and grid offer "Make"/"Make a clip" ONLY for
   `granted` proof; never for `awaiting`/`revoked` (seed includes one revoked: Leo M.).
6. **Request proof + links (US3 / FR-010, FR-009)**: "Request proof" is the persimmon primary action,
   keyboard-focusable, and does nothing on activate (no error). "View all in the inbox →" navigates to
   the `/app/proof` placeholder.
7. **Empty state (US5 / SC-006)**: point at a workspace with no proof (e.g. temporarily seed zero
   fixtures) — greeting renders, all proof KPIs read 0, no hero, an empty panel points to Request proof.

## Cold-start / error validation (US4 / SC-005)

- **Loading**: on first load (cold Neon) the `DashboardSkeleton` shows behind the chrome, then content
  streams in once the read resolves.
- **Transient retry**: simulate a transient failure (e.g. briefly point `DATABASE_URL` at an
  unreachable host, then restore) — `withDbRetry` retries; once reachable the page renders normally with
  no error shown.
- **Genuine error — page read**: keep the DB unreachable past the retry budget on the dashboard's own
  read — `app/app/error.tsx` shows the shared `<ErrorState>` **inside the chrome** (rail/top bar stay),
  with a "Try again" action and **no raw error text / connection string / stack trace** (FR-014). After
  restoring the DB, "Try again" renders the populated dashboard.
- **Genuine error — layout (workspace) read**: force the layout's `getCurrentWorkspace` read to fail
  past the retry budget — the **root** `app/error.tsx` shows the **same** `<ErrorState>` full-page (the
  chrome cannot mount without a workspace), again with retry and no raw error. Confirm it is the shared
  component (identical UI), not a Next.js default error page, and that **no `global-error.tsx`** exists.

## Definition of Done checks

```bash
# ProofCard byte-unchanged (FR-008 / SC-007) — must produce NO output:
git diff --quiet HEAD -- src/components/proof-card.tsx && echo "ProofCard unchanged ✓"

# Seam / schema / seed unchanged (FR-018 / A-07 / A-10):
git diff --quiet HEAD -- src/lib/session.ts src/db/schema.ts src/db/seed.ts && echo "seam+schema+seed unchanged ✓"

# No new dependency (FR-018 / SC-007):
git diff HEAD -- package.json package-lock.json   # expect no dependency additions

# Green build (P-Governance):
npm run typecheck && npm run lint && npm run build
```

- **Responsive (FR-015 / SC-003)**: check 480 / 1024 / 1280 and the 1240px content max — KPI strip,
  hero, and grid reflow with no horizontal scroll or overlap; actions reachable on small screens.
- **Both themes (P-IV)**: toggle Daylight/Ink — all surfaces re-theme; persimmon only on the primary
  actions + verified mark.
- **Keyboard (FR-016)**: Tab reaches Request proof, the hero CTA (when present), "View all in the
  inbox", and each ProofCard control, each with a visible focus ring.
- **Microcopy (FR-017)**: section labels read "Latest proof", "Recent proof", "View all in the inbox →";
  no "amazing"/"awesome"/emoji.
- **CI**: typecheck + lint + build green, including without `DATABASE_URL` (lazy `getDb()`).
