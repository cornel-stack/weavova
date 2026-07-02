# Contract — Routing gate (onboarded_at)

Symmetric gate across the two Layer-2 layouts. Middleware only extends its matcher; it does **no** DB
read.

## Forward gate — `src/app/app/layout.tsx`

```
const workspace = await getCurrentWorkspace()   // already returns onboarded_at (T6.1)
if (workspace.onboardedAt == null) redirect("/onboard/role")
// else render AppChrome as today (byte-stable for onboarded users)
```

- Every `/app/*` route inherits this layout → no app surface renders for an un-onboarded workspace.
- Seeded owner / finished users: `onboarded_at` set → no-op → straight to the app.

## Inverse gate — `src/app/onboard/layout.tsx` (NEW)

```
const workspace = await getCurrentWorkspace()
if (workspace.onboardedAt != null) redirect("/app")
// else render the minimal wizard chrome (step rail 1..4 + global "Skip for now")
```

- Prevents a finished user or the seeded owner from re-entering the wizard by URL (INV-3).
- The wizard chrome is its **own** minimal layout (not the app rail) — per the designs.

## Middleware — `src/middleware.ts`

```
export const config = { matcher: ["/app/:path*", "/onboard/:path*"] }
```

- `/onboard` gains the same Layer-1 cookie-presence gate (signed out → `/login`). Still **no** DB read
  in middleware (edge-safe, build-green-without-DATABASE_URL preserved).

## Guarantees

| Guarantee | Mechanism | Ref |
|---|---|---|
| Un-onboarded → wizard | forward gate | FR-001 / INV-1 |
| Onboarded (incl. seed) → app, no wizard | forward gate no-op + inverse gate | FR-002 / INV-1 |
| No app surface leaks pre-onboarding | gate in the shared `/app` layout | FR-001 |
| No wizard re-entry post-finish | inverse gate + `onboarded_at` terminal | FR-009 / INV-3 |
| `src/lib/session.ts` untouched | `onboarded_at` already in `getCurrentWorkspace()` (T6.1) | — |

## Non-goals

- No DB read added to middleware. No change to `getCurrentWorkspace()`. No resume-at-furthest logic
  (start at step 1 with pre-fill — research D5).
