# Contract — Studio route & surface

The `/app/proof/[id]/studio` route segment: its files, the open/branch flow, the rendered surface, the
derived states, and the "Make a clip" wiring. Ports `/design-reference` screen 04.

## Route segment (under the existing proof route, inside AppChrome)

```text
src/app/app/proof/[id]/studio/
├── page.tsx        # Server: const { id } = await params; workspace = getCurrentWorkspace();
│                   #         <Suspense fallback={<StudioSkeleton/>}><StudioData workspaceId id/></Suspense>
│                   #         export const metadata = { title: "Clip studio — Weavova" }
│                   #         (inherits /app force-dynamic + AppChrome from the layout — chrome untouched)
├── loading.tsx     # Server: <StudioSkeleton/>
├── error.tsx       # "use client" boundary: <ErrorState onRetry={reset}/> — no raw error text/digest
└── not-found.tsx   # Server: the SAME tenant-isolated, content-free not-found as the detail (reuse
                    #         ProofDetailNotFound) — no existence oracle, no cross-workspace leak
```

## Open flow (server-first)

1. `page.tsx` resolves `id` + workspace (unchanged seam), streams `<StudioSkeleton/>` via `<Suspense>`.
2. `studio-data.tsx` (async Server): `proof = await getProof(workspaceId, id)` — the **existing** T2.3 read
   (`withDbRetry`-wrapped, tenant-isolated). `if (!proof) notFound();`.
3. Branch on `proof.consentState`:
   - `=== 'granted'` → `<ClipStudio proof={proof} />` (configure-and-generate).
   - `!== 'granted'` → `<StudioConsentRequired />` — honest "consent required, no clip" state. **This also
     covers a directly-reached studio for a non-granted proof** (FR-008 edge): the gate lives at the
     studio, not only the button.

## The surface (`clip-studio.tsx`, Server — ported from screen 04)

- **Display / preview panel**: the proof as the headline (Principle II) — the customer's words/quote lead;
  chrome stays quiet. No fabricated transcript/caption/scene overlaid as the customer's (FR-007/011c).
- **Configuration panel** embeds the one Client island (`clip-studio-form.tsx`):
  - **Format** — a selectable control over `FORMAT_OPTIONS`, default `9x16`. (NOT screen-04's template
    presets — those are a T8 template-family concern, FR-004.)
  - **Editable hook** — a text field, brand-authored non-fabricated default, visually/semantically separate
    from the customer's quote (render spec §7.4); never an AI suggestion; never the customer's words.
  - **Generate** — persimmon primary action.
- **Close** affordance → `Link href="/app/proof/[id]"` (back to the proof; chrome intact).
- **NOT rendered** (A-11 / FR-011, asserted by inspection): cutaway/product-media picker or "matched
  shots"; music-track library; multi-brand-kit selector; user-editable scene/highlight timeline; "auto-
  stitched · N scenes"; AI hook/cutaway suggestions; any view/reach/engagement/warmth metric (FR-012).

## Principle VIII (no editor) — asserted

The studio exposes **only** a Format picker + a hook text field + Generate (+ close). There is **no**
timeline, track, scrubber, or any per-frame/per-segment editing affordance. SC-002 = 0 such controls.

## Generate interaction (`clip-studio-form.tsx`, Client)

On submit → call `generateClip({ proofId: proof.id, format, hook })`; play the **press-run** animation
(CSS/token-driven, celebrate ≤420ms, `cubic-bezier(0.2,0,0,1)`; **settles instantly** under
`prefers-reduced-motion`); then switch on the result:

- `generated` → reveal the **labelled sample** (FR-007): copy makes it unmistakably a sample/preview
  standing in for the real render; echo the chosen format/hook as *configured provenance*, not as rendered
  pixels; same sample regardless of config (limitation surfaced).
- `consent_required` → show the honest consent-required state (no clip).
- `error` → show an inline retry (no clip, no fabricated metric).

Keyboard (FR-016): the trigger, Format, hook, Generate, and close are reachable/operable with visible
focus; the surface manages focus and closes on the standard affordance.

## "Make a clip" wiring (FR-001 — the one in-scope existing-UI edit)

`src/components/app/proof-detail/proof-detail-actions.tsx`: the inert `<button>` becomes a navigating
`<Link href={\`/app/proof/${proof.id}/studio\`}>`, **still consent-gated** (renders only when
`consentState === 'granted'` — unchanged) and styled identically (persimmon primary, Scissors icon, same
classes). No other proof-detail component changes.

## Byte-stability (asserted; verified in quickstart)

- ProofCard, `ProofView`/`ProofCardProps`/`ProofDetailView`, `getProofs`/`getProof`/`toView`/`toDetailView`,
  and **all T2.4a reads** unchanged. AppChrome/rail/top-bar/switcher/palette unchanged. No schema change.
- Only **additions** elsewhere (the route segment, the `clip-studio/` components, two query functions, the
  shared constant + studio types) — plus the single `proof-detail-actions.tsx` wiring edit (FR-001).
