# Quickstart / validation — T6 Real authentication + workspaces

How to prove the slice works end to end. Not implementation — a run/verify guide. Assumes C1/C2 are
answered and tasks are implemented.

## Prerequisites

- `.env.local` with: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
  `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM` (verified Resend sender), `AUTH_TRUST_HOST=true` (local), and
  `SEED_OWNER_EMAIL` (the demo owner's **login email**; the **display identity stays "Maya K."** — C1=A).
- Google OAuth client redirect URIs registered (local + Vercel) — see plan Env table.
- `npm run db:generate && npm run db:migrate` (apply `0004`), then `npm run db:seed` (creates the demo
  user + owner membership over the existing Lumen workspace).
- **Passwordless + Google only** — there is no password field, no Forgot/Reset, and no GitHub button
  (deliberately superseded; see the spec's "Design reconciliation").

### Seed fixtures (T025 — resolved)

The seed ships **15 proofs** for Lumen (4 text · 4 video · 4 photo · 3 audio) + 4 clips — the
documented demo set. The inbox header count is **computed** from real data
(`counts.total = proofs.length` → "15 of 15"), never hardcoded (P-XIV). The design mock screen 02's
"12 of 12" is a **stale illustration**, not a data contract — no seed bug, no fix. The seed is
re-runnable (destructive reset → always 15) and idempotently upserts the demo user + owner membership.

## Build / CI parity (no creds)

- `npm run typecheck` and `npm run build` are **green with no `AUTH_*` set** (lazy auth config + lazy
  db). This is the CI gate.

## Scenario 1 — Magic-link sign-in (US1)

1. Visit `/` unauthenticated → redirected to `/login`. The page is the ported Pressroom **split frame**:
   a proof panel (Maria L. "Verified real customer" card + "The customer is the headline.") beside the
   form, with the **official Google logo** on "Continue with Google".
2. Enter `SEED_OWNER_EMAIL`, submit → `/verify` shows "Check your email" (same split frame) naming the
   address, with a "Request a new link" affordance (magic-LINK, not a 6-digit code).
3. Open the email (Resend), click the link → land authenticated at `/app` (dashboard) showing **Lumen
   Candle Co.** data (the existing seeded proof).
4. Expired/used link → honest error + "request a new link" (no broken page).

## Scenario 2 — Google sign-in + linking (US2, US5)

1. From `/login`, "Continue with Google", complete consent → authenticated at `/app`.
2. Using the **same verified email** as Scenario 1 → resolves to the **same one user + Lumen
   workspace** (no duplicate). Verify: one `user` row for that email, one `membership`.

## Scenario 3 — Seam swap byte-stability (US3, P-V, FR-021)

1. Signed in, visit every FR-021 page (dashboard, inbox, proof detail, studio, clip detail, library,
   consent, brand kit, footage, showcase) → all render unchanged vs pre-T6, scoped to Lumen.
2. `git diff` the FR-021 **Pages + Server Actions** → **no changes** (they still call the seam). Only
   `session.ts`, `user-menu.tsx`, `workspace-switcher.tsx` (C2), the styleguide page, schema/seed,
   `auth.ts`, `middleware.ts`, and the auth routes are touched.
3. Trigger a Server Action (generate a clip, withdraw consent) → works, scoped to Lumen.

## Scenario 4 — Security: both layers (FR-008, FR-017)

1. Signed out, request `/app`, `/app/library`, `/app/consent` → each redirects to `/login`, **no flash**
   of data.
2. Layer 2: confirm every query in `queries.ts` filters by `workspaceId` (grep: no read omits it);
   a loader resolves the workspace via `getCurrentWorkspace()`/`requireWorkspace()`.

## Scenario 5 — Sign-out (US4)

1. Open the user menu → "Sign out" → returned to `/login`; `/app` no longer reachable without
   re-signing-in.

## Scenario 6 — Honest coming-state (FR-019, P-XIII)

1. Open the **workspace-switcher popover** (top bar) → it shows an **"Invite teammates"** row with a
   **"Soon"** tag (C2=A placement — switcher popover, not the T9 settings surface). It is a
   non-interactive labeled coming-state (muted, not a clickable/dead button, not a fake action), with no
   fabricated member count (P-XIV).

## Scenario 7 — Flagged couplings (plan §6)

1. **Styleguide**: `/styleguide/data` renders in `dev` (reads the default workspace, no session);
   in a production build it returns 404.
2. **Error boundary**: kill `DATABASE_URL` mid-session → the root `ErrorState` shows (DB failure path),
   NOT thrown by the auth/no-workspace path (that path redirects).

## Done-when (DoD)

Both providers sign in; one user per verified email; all FR-021 surfaces render unchanged on Lumen;
signed-out `/app/*` redirects with no flash; sign-out works; invites coming-state visible; consent
behaviour identical (P-VII); build green without creds.
