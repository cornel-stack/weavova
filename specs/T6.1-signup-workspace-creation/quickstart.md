# Quickstart — Verifying T6.1 Signup → Workspace Creation

Validation guide (no implementation code). Proves the bootstrap fires correctly, is atomic, idempotent,
self-healing, provider-agnostic, leaves the seed untouched, and that empty states are honest.

## Prerequisites

- `DATABASE_URL` (Neon) set locally; auth env for at least one provider:
  - Magic-link: `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM` (verified Resend sender).
  - Google: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.
- Migration applied: `npx drizzle-kit generate` then `npx drizzle-kit migrate` (adds
  `workspace.onboarded_at`).
- Seed present: `npm run db:seed` (seeds Lumen with `onboarded_at` set = already onboarded).
- `npm run dev`.

## Build gate

```
npm run build   # must be green
npm run lint
```

## Scenario A — Brand-new user, magic-link (US1 · FR-001/002/003/007/012)

1. Sign in at `/login` with an email that has **no** existing user/membership.
2. Complete the magic link.
3. **Expect:** you land in `/app` in a workspace named `"{email local-part}'s workspace"` (no name on
   magic-link) — not Lumen.
4. **DB check:** exactly one new `workspace` row (`onboarded_at IS NULL`) and one `membership`
   (`role = 'owner'`) for the new user.

## Scenario B — Brand-new user, Google (US1 · FR-001/007 · provider-agnostic)

1. Sign in with a Google account with no existing user/membership.
2. **Expect:** workspace named `"{firstName}'s workspace"` (Google supplies a name); one workspace + one
   owner membership; `onboarded_at IS NULL`.

## Scenario C — Seeded owner is untouched (US2 · FR-008 · INV-3)

1. Sign in as the seed owner email (`SEED_OWNER_EMAIL`, default `amalacornel@gmail.com`).
2. **Expect:** you land in **Lumen Candle Co.**; **no** new workspace or membership is created;
   Lumen's `onboarded_at` remains set.

## Scenario D — Account linking does not double-create (US2 · FR-006)

1. As a user who already owns a workspace (e.g. from Scenario A), sign in with a **different** provider
   for the **same** verified email (link Google to the magic-link account, or vice versa).
2. **Expect:** you resolve to the **same** existing workspace; **no** second workspace is created.

## Scenario E — Idempotency / concurrent first sign-in (US1 · FR-004 · INV-2)

1. Simulate two near-simultaneous first sign-ins for the same new user (e.g. two browsers completing the
   same magic link, or rapid retries).
2. **Expect:** exactly **one** workspace and **one** owner membership — never two. (The deterministic
   slug + `workspace_slug_unique` abort the duplicate batch; the loser is a silent no-op.)

## Scenario F — Self-heal a stranded user (edge · FR-005/013)

1. Create the stranded state: a `user` row with **zero** memberships (e.g. delete the membership+
   workspace for a test user, leaving the user row).
2. Sign in as that user.
3. **Expect:** a workspace + owner membership are created on this sign-in (the app does not dead-end);
   `getCurrentWorkspace()` resolves.

## Scenario G — Empty states are honest (US1 · FR-010/011 · P-XIII/XIV)

As the Scenario A/B new user, visit each and confirm no error and an honest empty state / defaults
(full matrix in `contracts/empty-state-verification.md`):

- `/app` — greeting + KPIs at 0 + "No proof yet".
- `/app/proof` — honest no-proof empty.
- `/app/requests` — "No requests yet."
- `/app/library` — `LibraryEmpty`.
- `/app/showcase` — `ShowcaseEmpty`.
- `/app/consent` — honest empty ledger.
- `/app/brand` — fresh kit at Pressroom defaults, "No logo yet".

## Byte-stability spot check (FR-009)

Confirm the seeded owner's dashboard/inbox/etc. render identically to before this slice (no change to
`getCurrentWorkspace()` return shape; `src/lib/session.ts` untouched).

## Pass = all of

- A–B create exactly one workspace+owner membership, correctly named, `onboarded_at IS NULL`.
- C leaves Lumen and the seed untouched.
- D and E never double-create.
- F self-heals.
- G shows honest empty states everywhere; no errors, no seeded-looking data.
- `npm run build` + `npm run lint` green.
