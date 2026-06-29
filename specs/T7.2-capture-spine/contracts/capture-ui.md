# Contract — Capture UI port map (`src/app/c/[token]/`)

A faithful **mobile-first port** of `design-reference/Weavova/Capture/`, light + dark, Pressroom tokens.
The flow is a client **state machine** in `capture-flow.tsx`; each state is a ported sub-screen. The
public **server component** `page.tsx` resolves the token and renders the block or the flow.

## Page-level (server) — `page.tsx`

- `getCaptureRequestByToken(token)` → render:
  - `ok` → `<CaptureFlow request={view} />` (client), themed by the brand kit (brand colour as a CSS
    var, `contrastOn` for the on-colour); inherits root layout (fonts + ThemeProvider) — **no /app chrome**.
  - `expired` / `used` → an **honest block** carrying the screen-10 message intent ("This link has
    expired… {brand} can send you a fresh one" / "already used"). Minimal this slice; polished `10 _
    Expired link` → T7.2b.
  - `not_found` → an honest invalid block (no workspace leak).
- Mobile-first viewport (a `viewport` export); the design is a phone surface.

## State machine — `capture-flow.tsx`

```text
prompt ──Record a quick video──▶ record ──stop──▶ review ──Use this──▶ consent ──Send──▶ sending ──▶ thanks
prompt ──Write it─────────────▶ write  ──Use this──────────────────▶ consent ──Send──▶ sending ──▶ thanks
prompt ──Add a photo / Record audio──▶ "coming" (honest, P-XIII — not a dead control)
review ──Retake──▶ record                     (no edit — P-VIII)
```

| State | Binding reference | Verbatim copy (lifted) | Notes |
|---|---|---|---|
| `prompt` | `01 _ Prompt _live _ tap Record_` | "How did the {product} work out, {name}?" · "A few honest words is all it takes. Takes about 20 seconds." · Record a quick video / Write it / Add a photo / Record audio · "powered by Weavova" | brand-addressed; all four shown; photo/audio → coming |
| `record` | `02 _ Recording` | timer "0:29" · "about 20 seconds" | MediaRecorder; upload fallback if unsupported |
| `review` | `03 _ Review` | "Looks good?" · "Not sent yet — you can retake." · Use this / Retake | record→review only; **no edit** |
| `write` | `07 _ Write it` | "In your own words —" · Use this | textarea; empty rejected; verbatim |
| `consent` | `04 _ Consent` | "One last thing." · "I'm happy for {Workspace} to share this in their marketing." · "Read the full terms" · "Send to {brand}" | least-privilege organic; **name/face control** (pre-filled ws default, more-private-only); takedown expectation copy |
| `sending` | `05 _ Sending` | (transition) | submit; honest upload/save error + retry |
| `thanks` | `06 _ Thank-you` | "Thank you, {name}." · "Your words mean a lot to us." · "— {Workspace}" · "Follow {brand} →" | confirmation |
| `coming` | (honest "coming") | — | photo/audio not wired this slice (P-XIII) |
| block | `10 _ Expired link` (minimal) | "This link has expired…" · "Ask {brand} for a new link" | page-level for used/expired |

## States (DoD — per the designs)

- **Loading** — token resolution + brand load (server); a quiet skeleton if needed.
- **Sending** — screen 05 during submit.
- **Error** — upload failure → honest retry (no proof written); save failure → honest "couldn't save —
  ask {brand} for a new link" (token burned, single-use).
- **Empty** — empty/whitespace text rejected (no empty proof).
- **Coming** — photo/audio → honest coming-state (not a dead control).
- **Block** — expired / used / not-found → honest block (no 500, no workspace leak).

## Constitution at the UI layer

- **P-II**: the customer's words/video are the whole content; chrome quiet.
- **P-IV**: tokens only; **brand colour** themes the page (workspace brand kit), persimmon scarce, **no
  verified mark shown** (the stamp is not earned yet).
- **P-V**: every state names its reference; divergences (e.g. the name/face control placement on 04) are
  documented decisions, not drift.
- **P-VIII**: record→review→submit; **no** editor.
- **P-XIII**: photo/audio + the polished expired surface are honest coming-states.
- **P-XVII**: verbatim copy; no hype, no emoji.
