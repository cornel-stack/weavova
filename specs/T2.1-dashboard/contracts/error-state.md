# Contract — `<ErrorState>` (shared themed error UI)

**Location**: `src/components/app/error-state.tsx`. One presentational error component reused by **both**
error boundaries so there is a single themed error UI (no duplication).

## Signature (intended)

```tsx
export function ErrorState(props: {
  onRetry: () => void;       // wired to the boundary's reset()
  title?: string;            // default: a calm on-brand line, e.g. "Something went wrong"
  description?: string;      // default: a generic, safe message — never the raw error
}): JSX.Element;
```

## Behaviour contract

- Renders an on-token panel (Pressroom tokens only) with a title, a short safe message, and a single
  **retry** action (persimmon primary — it is the primary action on this surface) bound to `onRetry`.
- **Never** renders raw error text, `error.message`, `error.stack`, `error.digest`, or any connection
  string (FR-014). The boundaries pass nothing sensitive into it.
- Purely presentational (no data reads). Rendered inside Client error boundaries, so it ships as Client.

## Consumers (the two boundaries — both `"use client"`)

| File | Catches | Layout context | Renders |
|---|---|---|---|
| `src/app/app/error.tsx` | a throw in `app/app/page.tsx` / `DashboardBody` (the page read) | inside `AppChrome` — chrome stays mounted | `<ErrorState onRetry={reset}/>` in the content area |
| `src/app/error.tsx` (root) | a throw in `app/app/layout.tsx` (the workspace read), which a segment's own `error.tsx` cannot catch | above `AppChrome` — chrome cannot mount | `<ErrorState onRetry={reset}/>` full-page |

- `reset()` re-renders the failed segment; with the DB reachable the read succeeds and the normal UI
  returns.
- **No `global-error.tsx`** is added (the root layout performs no risky read), and no other chrome change
  is made.
