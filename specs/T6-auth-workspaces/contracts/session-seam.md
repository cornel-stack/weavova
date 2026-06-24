# Contract — the session seam (`src/lib/session.ts`)

The whole P-V guarantee of T6. These two functions keep **identical signatures and return shapes**;
only their bodies change from stub to session-backed. Every consumer (FR-021) calls them and stays
byte-stable.

## `getSession(): Promise<Session>`

- **Return shape (UNCHANGED)**: `{ user: { name: string; initials: string; email?: string } }`.
- **Before**: hardcoded `{ name: "Maya K.", initials: "MK", email: "maya@lumencandle.co" }`.
- **After**: read `auth()`; map the real user → the same shape. `initials` derived from `name`
  (fallback: email local-part). Within `/app/*` a session always exists (middleware guarantees it).
- **Consumers**: `src/app/app/layout.tsx`, `src/components/app/dashboard/dashboard-body.tsx` →
  `UserMenu`. They must not change.

## `getCurrentWorkspace(): Promise<Workspace>`

- **Return type (UNCHANGED)**: `typeof workspace.$inferSelect` (`{ id, name, slug, createdAt }`).
- **Before**: `getDefaultWorkspace()` (oldest workspace row).
- **After**: resolve the **session user's** workspace via `membership` (their single v1 workspace).
- **No-workspace path**: an authenticated user with no membership → **redirect** to a minimal
  "setting up" route (never throw). Provisioning (research D4) makes this path essentially unreachable;
  the redirect is the safety net so `error.tsx` is not used for auth (plan §6).
- **Consumers (must not change)**: all 11 pages + 8 action files in the FR-021 list below; each already
  calls `getCurrentWorkspace()` and passes `workspace.id` to a `workspaceId`-scoped query.

## `requireWorkspace()` — NEW (Layer-2 entry helper, FR-017)

- Thin wrapper returning the session `Workspace` (or redirecting) — the single documented entry for
  loaders/actions so none reads the db without a `workspaceId`. Does not change query signatures (they
  already take `workspaceId`). Optional convenience layered over `getCurrentWorkspace()`.

## FR-021 regression surface (byte-stable except the identity read)

**Pages**: `app/app/layout.tsx` (session + workspace; workspace switcher + user menu) ·
`app/app/page.tsx` (+ `dashboard-body.tsx`) · `app/app/proof/page.tsx` · `app/app/proof/[id]/page.tsx`
· `app/app/proof/[id]/studio/page.tsx` · `app/app/clip/[id]/page.tsx` · `app/app/library/page.tsx` ·
`app/app/consent/page.tsx` · `app/app/brand/page.tsx` · `app/app/footage/page.tsx` ·
`app/app/showcase/page.tsx`.

**Server Actions**: `proof/[id]/studio/actions.ts` (`generateClip`) · `proof/[id]/actions.ts` ·
`proof/actions.ts` (`generateBatch`) · `proof/warmth-actions.ts` · `library/actions.ts`
(`exportClips`) · `consent/actions.ts` (withdrawal) · `brand/actions.ts` (save + logo presign) ·
`footage/actions.ts`.

**Out of the seam**: `app/styleguide/data/page.tsx` → switches to `getDefaultWorkspace()` directly +
dev-only (plan §6); `app/error.tsx` → unchanged.

**Acceptance**: a `git diff` over the Pages + Server Actions above shows **no change** (they keep
calling the seam); the only edited consumer-adjacent files are `session.ts` (bodies), `user-menu.tsx`
(sign-out), `workspace-switcher.tsx` (C2 invites row, if A), and the styleguide page (dev-only).
