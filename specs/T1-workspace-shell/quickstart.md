# Quickstart — Validate T1

Runnable validation, each mapped to a Success Criterion. Run after `/speckit.implement`.

## Prerequisites

- Deps installed (`npm install`) including `cmdk`. A Neon `DATABASE_URL` in `.env.local` (the shell
  reads the demo workspace at runtime); the T0.3 seed has run.

## 1. The /app shell, scoped via the seam — SC-001 (US1)

```bash
npm run dev
# open http://localhost:3000/app
```

**Expect**: the rail (Weavova wordmark + the eight section links) and the top bar (workspace block,
search/⌘K trigger, theme toggle, user-menu) render, scoped to the seeded demo workspace via
`getCurrentWorkspace()`. No component hardcodes the workspace id (grep check below).

## 2. Placeholder routing inside the shell — SC-004

Click each rail link (Dashboard, Proof, Requests, Campaigns, Library, Showcase, Brand, Consent).

**Expect**: each routes to its placeholder page rendered **inside** the shell, with the active rail
link marked.

## 3. Command palette (⌘K) — SC-003 (US2)

- Press ⌘K (or click the search trigger) → the centered cmdk palette opens, input focused.
- Type to filter; Up/Down to select; Enter on a "Go to" item → navigates to that section inside the
  shell and the palette closes; Esc → closes and focus returns to the trigger.

**Expect**: grouped results ("Go to" sections + a few actions); fully keyboard-navigable; styled with
Pressroom tokens to match screen 14.

## 4. Workspace switcher — SC-002 (US3)

Open the switcher from the workspace block.

**Expect**: shows the current demo workspace (name + badge); the "new workspace" affordance is
present but inert; Esc / outside-click closes.

## 5. Both themes + responsive + keyboard — SC-005

Toggle Daylight/Ink (the shell + overlays re-theme). Narrow the viewport (the rail adapts on
mobile). Drive the shell, palette, and switcher by keyboard only.

## 6. Green gates + CI without a DB — SC-006

```bash
npm run typecheck && npm run lint && npm run build
```

**Expect**: all exit 0. The `/app` segment is dynamic (force-dynamic + lazy client), so `next build`
and CI are green **without** a `DATABASE_URL`.

## 7. No hardcoded workspace id — SC-001

```bash
# the only place the workspace is resolved is the seam:
grep -rn "getCurrentWorkspace\|getDefaultWorkspace" src/lib src/db | head
# components should not embed a workspace id or import the db directly:
grep -rn "workspaceId\s*[:=]\s*['\"]" src/components src/app/app || echo "no hardcoded workspace id"
```

## 8. ProofCard / existing components unchanged + no off-stack dep — SC-006, SC-007

```bash
git diff --stat main -- src/components/proof-card.tsx   # empty
# deps: only cmdk added beyond the existing stack
```

## Definition of done

`/app` shell scoped via the seam · placeholders route inside the shell · ⌘K palette keyboard-nav +
navigates · switcher shows the demo workspace · both themes + responsive + keyboard · typecheck/lint/
build + CI green without a DB · no hardcoded workspace id · ProofCard unchanged · only `cmdk` added.
