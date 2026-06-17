# Contract — Library surface (route + components)

Replaces the `/app/library` T1 placeholder with the real Library, inside the existing AppChrome. Ports
`/design-reference` screen 09 (clips-only — Q1).

## Route segment

```text
src/app/app/library/
├── page.tsx        # Server (REPLACES placeholder): workspace = getCurrentWorkspace();
│                   #   <Suspense fallback={<LibrarySkeleton/>}><LibraryData workspaceId/></Suspense>
│                   #   export const metadata = { title: "Library — Weavova" }
│                   #   (inherits /app force-dynamic + AppChrome from the layout — chrome untouched)
├── loading.tsx     # Server → <LibrarySkeleton/>  (route-segment fallback, mirrors the inbox)
└── error.tsx       # "use client" boundary → <ErrorState onRetry={reset}/>  (no raw error text)
```

## Components (`src/components/app/library/`)

- **`library-data.tsx`** (async Server): `clips = await getLibraryClips(workspace.id)`;
  `clips.length === 0` → `<LibraryEmpty/>`, else `<LibraryGrid clips={clips}/>`.
- **`library-grid.tsx`** (Server): a header (title "Library" + the **honest count**, e.g. "{n} clips" /
  "1 clip") and the **clip grid** — a responsive multi-column collection of `<LibraryClipCard>`, newest
  first (mirrors the inbox Wall's CSS columns; no JS masonry dependency).
- **`library-clip-card.tsx`** (Server): one clip. Shows the **source customer** (the headline — P-II), the
  **brand hook** when set (clearly the brand's words, separate from any customer quote — render spec §7.4),
  the **format** (display label via the studio's `FORMAT_OPTIONS` map), the **created date**, and the honest
  **"Sample preview"** chip. The **whole card is a `Link href={`/app/proof/${proofId}`}`** (the source proof
  — the one existing destination), keyboard-focusable with visible focus. The verified mark (persimmon) may
  show when `verified` (owned).
- **`library-empty.tsx`** (Server): the honest empty state (no fabricated rows/counts) — a quiet panel that
  orients toward making a clip, with a link to the proof inbox `/app/proof` (where "Make a clip" lives on a
  granted proof). Reached for zero clips **or** all-withheld.
- **`library-skeleton.tsx`** (Server): on-token loading skeleton mirroring the grid (placeholder cards).

## A-11 — NOT rendered (hidden, not dead; asserted by inspection)

- Kind / Source / Consent **filters** (clips-only — Q1; a Consent filter also contradicts read-time
  withdrawal, which already removes non-granted clips).
- The **List/Grid toggle** (single grid view; both not built).
- The **"Download clips (N)"** bulk action (export = T4).
- The **Ready / Queued** render-status column (no owned render pipeline pre-T8 — FR-019).
- Any per-clip **detail link** (T3.2 unbuilt) or **inline sample playback** (no real render — FR-019).
- Any **view / reach / engagement / performance** metric (FR-012).

## State set (FR-008/009/010)

| State | Source |
|---|---|
| Populated | `<LibraryGrid>` — the clip cards + honest count |
| Empty (honest) | `<LibraryEmpty>` — zero clips OR all withheld; no fabricated rows/counts |
| Loading | `<LibrarySkeleton>` via `loading.tsx` + the page Suspense |
| Error | `error.tsx` → shared `<ErrorState>` (retry, no raw text); transient cold start retried by `withDbRetry` |

## Assertions

- **P-II**: each card leads with the customer; chrome stays quiet. **FR-019**: owned values only; clips
  shown as honest **sample/preview**. **P-VII**: visibility = the shared withdrawal gate (parity with
  dashboard/detail). **A-11**: only controls with a live destination/data render.
- **Byte-stable**: ProofCard, `ProofView`/`getProofs`/`getProof`/`ProofDetailView`, `ClipView`, all existing
  clip reads, and `schema.ts` unchanged. AppChrome untouched. No new dependency.
