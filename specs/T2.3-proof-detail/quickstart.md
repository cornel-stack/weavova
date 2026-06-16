# Quickstart — Validate T2.3 Proof Detail

A run/validation guide. Implementation details live in `plan.md` / `tasks.md`. This proves the slice
meets its acceptance criteria and Definition of Done.

## Prerequisites

- `.env.local` with a pooled Neon `DATABASE_URL`; seed present (`npm run db:seed`).

## Run

```bash
npm run dev    # http://localhost:3000/app/proof  → click any card → /app/proof/[id]
```

## Functional validation (acceptance criteria)

1. **Read one proof (US1 / FR-002,003,004)**: from the inbox, open a proof. The detail renders inside the
   chrome with a "← Proof" back link; the customer's words (transcript for media, quote for text) are the
   largest element; customer name, source, captured date, type, and verified/reviewed state are the
   proof's real data (nothing hardcoded).
2. **Consent panel (US2 / FR-005)**: the panel shows the effective consent **state + date + version**, e.g.
   "Consent granted · {date} · v1"; open the seeded **revoked** proof (Leo M.) → "Consent revoked · {date} ·
   v2" (its revocation date+version); an **awaiting** proof → "Awaiting consent · v1". Read-only — no
   grant/revoke/edit control.
3. **Consent gate (FR-006 / SC-004)**: for **granted** proof the inert "Make a clip" (persimmon) is shown;
   for **awaiting/revoked** proof no clip/asset action is offered.
4. **Conditional media (Q1 / FR-009 / SC-003)**: every seeded media proof (video/photo/audio) has no media
   file → **no media frame, poster, placeholder, or player** appears; the transcript leads as the content.
   No fabricated duration/scrubber/play anywhere.
5. **No tab chrome (Q3 / FR-016a)**: the transcript is shown as the content; **no** "Suggested formats" /
   "Generated assets · N" / "Activity" tabs appear (no fabricated count).
6. **Honesty (FR-008,017,019 / SC-007)**: **no** warmth/sentiment panel, **no** product/variant line, **no**
   reach/views — nothing un-owned is shown.
7. **Inert / hidden actions (A-11 / FR-007,016c)**: **only** "Make a clip" renders (present-but-inert —
   keyboard-reachable, no-op, never errors); "Carousel", "Embed", and "Ask this customer for more" are
   **NOT shown** (deferred to T4/T5/outreach).
8. **Back navigation (FR-015)**: "← Proof" returns to `/app/proof` (the inbox).

## Tenant isolation & states validation (US3, US4)

- **Not-found — non-existent id (FR-011 / SC-005)**: visit `/app/proof/does-not-exist` → an honest
  "not found" state (inside the chrome) with a back-to-inbox link; **no** proof content, **no** raw error.
- **Not-found — cross-workspace id (FR-011 / SC-005)**: visit `/app/proof/[id]` for an id from a
  **different** workspace → the **same** not-found state (indistinguishable from "doesn't exist"; no
  existence oracle; no other-tenant data rendered).
- **Not-found ≠ error (FR-012)**: the not-found state is visibly/semantically distinct from the error state.
- **Loading (FR-014)**: first load (cold Neon) shows the `ProofDetailSkeleton` behind the chrome.
- **Cold-start recovery (SC-006)**: a transient failure retries (`withDbRetry`) and renders normally.
- **Error (FR-014)**: a failure past the retry budget shows the shared `<ErrorState>` (inside the chrome)
  with retry and no raw error text.

## Definition of Done checks

```bash
# Shared shape + card byte-stable (FR-023) — must produce NO output:
git diff --quiet HEAD -- src/components/proof-card.tsx && echo "ProofCard unchanged ✓"

# Reused infra + seam/schema/seed unchanged:
git diff --quiet HEAD -- src/components/app/error-state.tsx src/db/with-retry.ts src/app/error.tsx \
  src/app/app/proof/error.tsx src/lib/session.ts src/db/schema.ts src/db/seed.ts \
  && echo "reused infra + seam/schema/seed unchanged ✓"

# ProofView / getProofs byte-stable — only ProofDetailView added + getProof changed:
#   git diff src/lib/proof.ts        → expect ONLY an added ProofDetailView (ProofView block unchanged)
#   git diff src/db/queries.ts       → expect getProof changed; getProofs / proofColumns / toView unchanged

# No new dependency:
git diff HEAD -- package.json package-lock.json   # expect no dependency additions

# Green build (incl. without DATABASE_URL — CI parity):
npm run typecheck && npm run lint && npm run build
```

- **Responsive (FR-020 / SC-008)**: 480 / 1024 / 1280 + 1240 max — the two-column layout reflows to one
  column; no horizontal scroll/overlap.
- **Both themes (P-IV)**: Daylight/Ink re-theme everything; persimmon only on "Make a clip" + the verified
  mark.
- **Keyboard (FR-021)**: the back link, the inert "Make a clip" (where shown), and any retained control are
  reachable with visible focus.
- **Microcopy (FR-022)**: matches screen 03 wording where specified; honest about absent data; no
  "amazing"/"awesome"/emoji; `<ErrorState>` shows no raw error text.
