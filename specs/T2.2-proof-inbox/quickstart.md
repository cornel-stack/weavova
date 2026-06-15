# Quickstart — Validate T2.2 Proof Inbox

A run/validation guide. Implementation details live in `plan.md` / `tasks.md`. This proves the slice
meets its acceptance criteria and Definition of Done.

## Prerequisites

- `.env.local` with a pooled Neon `DATABASE_URL`; seed present (`npm run db:seed` — relative dates from
  A-10, so the Wall is populated).

## Run

```bash
npm run dev        # http://localhost:3000/app/proof   (also: dashboard → "View all in the inbox →")
```

## Functional validation (acceptance criteria)

1. **Wall renders workspace proof (US1 / FR-002,003)**: `/app/proof` shows a masonry Wall of every
   seeded proof as the canonical ProofCard, inside the chrome; the customer's words/media lead each
   card; the count reads "{shown} of {total} pieces of proof" matching the data.
2. **Per-card state (FR-004 / SC-004)**: verified mark, unreviewed corner stamp, and consent dot reflect
   each proof; "Make" appears ONLY on granted proof (awaiting/revoked — incl. the revoked Leo M. — show
   no Make).
3. **Status filter (US2 / FR-005)**: New → only unreviewed; Reviewed → only reviewed; Awaiting consent →
   only awaiting; All → clears. Count updates each time.
4. **Type filter (FR-006)**: Video/Text/Photo/Audio each narrow to that type; All types clears.
5. **Search (FR-007)**: a term filters by customer name / words / source, case-insensitive.
6. **Combine (FR-008)**: status + type + search narrow together (AND); the count tracks the subset.
7. **Sort (US3 / FR-009,010)**: "Newest" orders by capture date (most recent first). "Warmest" is
   **visible but disabled** (not selectable; accessible "coming soon"); it never reorders the Wall and
   never shows a fabricated order.
8. **Navigation (US4 / FR-012)**: activating a card (click or keyboard) navigates to `/app/proof/[id]`,
   which renders a minimal placeholder (real detail = T2.3) and does not 404/error. The card's own
   "Make" remains independently clickable (no nested-link breakage).
9. **Hidden per A-11 (FR-013,014c)**: no Wall/List toggle is shown; no "Make clips" / "Select all ready"
   / per-card selection appears. **Inert (FR-014a,b)**: "Request proof" (persimmon) and "Add proof" (ink)
   are present and do nothing on activate without erroring.

## States validation (US5)

- **Loading (FR-016)**: first load (cold Neon) shows the `InboxSkeleton` (toolbar + Wall placeholders)
  behind the chrome, then content streams in.
- **Cold-start recovery (SC-005)**: a transient failure retries (`withDbRetry`) and renders normally
  with no error.
- **Error (FR-016)**: a failure past the retry budget shows the shared `<ErrorState>` (inside the chrome)
  with retry and no raw error text.
- **Empty — no proof (FR-017)**: a zero-proof workspace shows the `InboxEmpty` state (capture-oriented),
  not a filtered-empty panel.
- **Empty — filtered (FR-017 / SC-006)**: a filter/search that matches nothing shows the filtered-empty
  panel with a working **clear-filters** affordance (distinct from no-proof).

## Definition of Done checks

```bash
# ProofCard byte-unchanged (FR-003 / SC-008) — must produce NO output:
git diff --quiet HEAD -- src/components/proof-card.tsx && echo "ProofCard unchanged ✓"

# Reused infra + seam/schema/seed unchanged:
git diff --quiet HEAD -- src/components/app/error-state.tsx src/db/with-retry.ts src/app/error.tsx \
  src/lib/session.ts src/db/schema.ts src/db/seed.ts && echo "reused infra + seam/schema/seed unchanged ✓"

# No new dependency:
git diff HEAD -- package.json package-lock.json   # expect no dependency additions

# Green build (incl. without DATABASE_URL — CI parity):
npm run typecheck && npm run lint && npm run build
```

- **Responsive (FR-018 / SC-007)**: 480 / 1024 / 1280 + 1240 max — the Wall reflows its columns and the
  toolbar stays usable; no horizontal scroll/overlap.
- **Both themes (P-IV)**: Daylight/Ink re-theme everything; persimmon only on "Request proof" + the
  ProofCard's Make/verified mark.
- **Keyboard (FR-020)**: chips, type chips, search, sort, and each card's navigation link + Make are
  reachable with visible focus.
- **Microcopy (FR-021)**: chip labels, "Search proof", "{n} of {n} pieces of proof", "Sort · Newest"
  match screen 02; no "amazing"/"awesome"/emoji; ErrorState shows no raw error text.
