# Contract — Clip-detail surface (route + components)

The `/app/clip/[id]` route (Q2), inside the existing AppChrome. **No `/design-reference` screen to port** —
a derived surface from proof-detail (03) + studio (04) + the render spec.

## Route segment

```text
src/app/app/clip/[id]/
├── page.tsx        # Server: const { id } = await params; workspace = getCurrentWorkspace();
│                   #   <Suspense fallback={<ClipDetailSkeleton/>}><ClipDetailData workspaceId id/></Suspense>
│                   #   export const metadata = { title: "Clip — Weavova" }  (inherits /app force-dynamic + AppChrome)
├── loading.tsx     # Server → <ClipDetailSkeleton/>
├── error.tsx       # "use client" boundary → <ErrorState onRetry={reset}/> (no raw text) — the ONLY client file
└── not-found.tsx   # Server → <ClipDetailNotFound/> (content-free; one state for missing/cross-ws/withdrawn)
```

## Components (`src/components/app/clip-detail/`)

- **`clip-detail-data.tsx`** (async Server): `clip = await getClip(workspace.id, id)`; `if (!clip)
  notFound();`; → `<ClipDetail clip={clip}/>`.
- **`clip-detail.tsx`** (Server): the two-column layout (proof-detail 03 pattern):
  - **content column** — the clip as a **non-playing "Sample preview" still** in `clip.format`'s aspect
    (studio-04 framing; a labelled frame + format badge; **no `<video>`, no play control** — Q1/FR-019); the
    brand **hook** when set (clearly the brand's words, separate from any customer quote — render spec §7.4);
    a back affordance to the Library (`/app/library`).
  - **side panel** — **provenance**: the source customer + the verified mark; a **source-proof link**
    (`/app/proof/[proofId]`); the **made-under** consent ("made under consent v{madeUnderVersion} ·
    {madeUnderAt}"); the proof's **current** consent ("granted · {consentAt} · v{consentVersion}"); the
    **format**; the **created date**. **Actions**: **re-make** (persimmon primary) →
    `/app/proof/[proofId]/studio` (the consent-gated studio — consent re-checked there). **No**
    download/export/publish/share.
- **`clip-detail-skeleton.tsx`** (Server): on-token loading skeleton mirroring the two-column layout.
- **`clip-detail-not-found.tsx`** (Server): content-free not-found ("Clip not found", back to the Library) —
  mirrors `proof-detail-not-found.tsx`; **no clip data, no case-distinguishing hint** (missing/cross-ws/
  withdrawn identical).

## The Library-card re-wire (Q3 — A-11 completion)

`src/components/app/library/library-clip-card.tsx`: `href` changes `/app/proof/${proofId}` →
**`/app/clip/${id}`**; `aria-label` → "Open {customerName}'s clip". The source-proof link **relocates into**
the clip detail (side panel). Markup/classes/appearance **otherwise unchanged** (appearance-preserving).

## A-11 — NOT rendered (hidden, not dead; asserted by inspection)

- **Inline playback** of the clip (no real render pre-T8; no `<video>` / play control — FR-019).
- **Download / export** (T4) · **publish / share** (T9).
- Any **view / reach / engagement / performance** metric or render **status** (FR-019).

## State set

| State | Source |
|---|---|
| Populated | `<ClipDetail>` — sample-still + hook \| provenance + re-make |
| Not-found (no oracle) | `not-found.tsx` → `<ClipDetailNotFound>` — one state for missing/cross-ws/withdrawn |
| Loading | `<ClipDetailSkeleton>` via `loading.tsx` + page Suspense |
| Error | `error.tsx` → shared `<ErrorState>` (retry, no raw text); cold start retried by `getClip`'s `withDbRetry` |

## Assertions

- **P-II**: the source customer leads; chrome quiet. **FR-019**: owned values + honest non-playing sample.
  **P-VII**: visibility = the shared gate; withdrawn → the no-oracle not-found; made-under shown as
  provenance. **A-11**: only live-destination actions (source-proof link, re-make → studio); no
  export/publish/play.
- **Byte-stable**: ProofCard, `ProofView`/`getProofs`/`getProof`/`ProofDetailView`, `ClipView`/
  `LibraryClipView`, and all existing reads unchanged; `schema.ts` unchanged; AppChrome untouched; the only
  existing-UI edit is the Library-card `href`. No new dependency.
