# Contract — auth schema + Auth.js config

## Migration `0004` (additive)

- Adds: `user`, `account`, `session`, `verification_token` (adapter shapes), `membership`, and the
  `membership_role` enum. See [../data-model.md](../data-model.md).
- Alters: **nothing**. No FK is added to existing content tables (content stays `workspace`-scoped;
  ownership is via `membership`). Existing rows untouched.
- Generated via `npm run db:generate`; applied via `npm run db:migrate`. Build/typecheck green without
  `DATABASE_URL` (lazy client).

## `src/auth.ts` (NextAuth v5) — config contract

```
NextAuth({
  adapter: DrizzleAdapter(getDb(), { usersTable, accountsTable, sessionsTable, verificationTokensTable }),
  session: { strategy: "database" },
  pages: { signIn: "/login", verifyRequest: "/verify" },
  providers: [
    Resend({ from: env.AUTH_EMAIL_FROM, apiKey: env.AUTH_RESEND_KEY }),     // magic-link
    Google({ allowDangerousEmailAccountLinking: true }),                    // link by verified email
  ],
  events: { createUser: provisionWorkspaceIfNone },                         // research D4
})
```

- **Exports**: `handlers` (→ `app/api/auth/[...nextauth]/route.ts`), `auth`, `signIn`, `signOut`.
- **Lazy**: env read at request time; missing `AUTH_*` errors only when an auth action runs (build
  stays green).
- **Security flag**: `allowDangerousEmailAccountLinking` is safe ONLY because both providers present
  verified emails (research D3) — documented inline.

## `src/middleware.ts` — contract

- `matcher: ["/app/:path*"]`. No session → `NextResponse.redirect("/login")`. Node runtime.
- Pairs with Layer 2 (`requireWorkspace()` + `workspaceId`-scoped queries) for multi-tenant safety
  (FR-008 + FR-017). Middleware alone is NOT sufficient — both layers required.

## Routing contract (FR-020)

| Path | Unauthenticated | Authenticated |
|---|---|---|
| `/` | → `/login` | → `/app` |
| `/app/*` | → `/login` (middleware) | render |
| `/login`, `/verify` | render | (optional) → `/app` |

## Provider acceptance

- Magic-link: submit email → Resend sends → `/verify` "check your email" → link → authenticated `/app`.
- Google: consent → authenticated `/app`; same verified email as an existing user → **one** user.
- Sign-out: ends session → `/login`; protected routes no longer reachable.
