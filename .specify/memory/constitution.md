<!--
Sync Impact Report
==================
Version change: 1.0.0 → 1.0.1
Rationale: PATCH. Completes the existing Ink (dark) token table (adds ink-3, rule, success,
warning, danger + persimmon-deep omission note) and syncs the dependent Spec Kit templates to
this constitution. No new principle; no governance redefinition.

v1.0.0 (initial ratification): first concrete constitution derived from CLAUDE.md, replacing
the unfilled spec-kit template; added all 12 principles below plus the supporting sections.

Principles (unchanged in 1.0.1):
  I.    Product Mission — Real, Consented Human Proof
  II.   The One Law — The Customer Is the Headline
  III.  Locked Tech Stack
  IV.   The Pressroom Design System
  V.    Port, Don't Redesign
  VI.   Fixtures-First
  VII.  Consent Is Sacred
  VIII. No Editor
  IX.   Spec-Driven Development Workflow
  X.    Coding Conventions
  XI.   Never-Do Rules
  XII.  Handling Ambiguity — Stop and Ask
Sections: Technology Constraints; Design Tokens (token tables); Governance

Templates synced to this constitution (resolved in 1.0.1):
  ✅ .specify/templates/plan-template.md   — Constitution Check now enumerates the binding gates
  ✅ .specify/templates/spec-template.md   — added Constitution Alignment mandatory section
  ✅ .specify/templates/tasks-template.md  — added principle-driven task types + per-slice DoD

Follow-up TODOs: none. RATIFICATION_DATE 2026-06-12 (first adoption); LAST_AMENDED 2026-06-12.
-->

# Weavova Constitution

Weavova captures a business's **real customer proof** at the moment a sale, booking, or delivery
happens and reshapes it into post-ready social content — short vertical clips, carousels, and
embeddable proof blocks — **with no video editor**. This constitution is derived from `CLAUDE.md`,
the project's source of truth. Where this document and `CLAUDE.md` conflict, surface the conflict
and ask before proceeding. Where a request conflicts with either, the same rule applies.

## Core Principles

### I. Product Mission — Real, Consented Human Proof

Weavova exists to make capturing and reshaping **real, verified, consented human proof**
effortless. The scarce, converting asset is a genuine human moment — a real face, a verbatim
quote — captured the instant a sale, booking, or delivery happens.

- Weavova IS: a system that captures real customer proof and turns it into post-ready clips,
  carousels, and embeddable proof blocks, with consent threaded throughout.
- Weavova is NOT: a synthetic AI-UGC generator. It is **counter-positioned** against the wave of
  tools that fabricate fake testimonials and AI-glossy "creators."
- Rationale: the entire product thesis is that authenticity converts. Anything that dilutes the
  realness of the proof attacks the reason the product exists. This principle is the lens for
  every feature decision: if it manufactures, fakes, or synthesizes proof, it is out of scope.

### II. The One Law — The Customer Is the Headline (NON-NEGOTIABLE)

On any surface that shows proof, **the real customer face or the verbatim customer quote is the
largest, warmest element on screen.** The app's chrome stays quiet; the proof is loud.

- The customer's words and face lead; navigation, controls, labels, and metadata recede.
- The app's UI never competes with, crops dishonestly, or visually outranks the customer's
  contribution on a proof surface.
- Rationale: this is the physical expression of Principle I. It is the single law every screen is
  measured against. When two layout choices conflict, the one that makes the customer larger and
  warmer wins.

### III. Locked Tech Stack (NON-NEGOTIABLE without explicit human approval)

The stack below is **locked**. Do not deviate, substitute, or add dependencies outside it without
proposing the change and its rationale first and receiving explicit human approval.

- **Framework:** Next.js 15 (App Router), React 19, TypeScript (strict). Deployed on **Vercel**.
- **Styling:** Tailwind v4 + the Pressroom tokens (Principle IV). Fonts via `next/font/google`.
- **Auth:** **Auth.js / NextAuth v5** with the Drizzle adapter. **NOT Supabase Auth.**
- **Database:** **Neon** Postgres + **Drizzle ORM** + drizzle-kit migrations.
- **Object storage (video/media):** **Cloudflare R2** (S3-compatible), presigned multipart uploads.
- **Jobs:** **Inngest** (durable async steps: generate / transcribe / publish).
- **Email:** **Resend** (magic links + notifications).
- **Render worker (FFmpeg + Revideo):** deferred to **tier T8**; it cannot run on Vercel. For the
  demo, **rendering is STUBBED** — the "Generate" action runs the press-run animation and returns a
  pre-made sample clip from R2. The real engine swaps in behind the same UI at T8.
- Rationale: a locked stack keeps fixtures, schema, and screens coherent and prevents drift that
  would force rework. Heavy render never runs on Vercel due to binary/CPU/time limits.

### IV. The Pressroom Design System (tokens are the single source of truth)

The Pressroom is a warm, editorial system: warm paper and ink, one hot persimmon accent used like
an inked stamp, tactile not flat. **The tokens below are the single source of truth** — use them
exactly; do not introduce off-token colours, fonts, radii, or motion values.

**Colours — Daylight (light, default)**

| Token | Hex |
|---|---|
| paper | `#F7F2E8` |
| card | `#FFFDF7` |
| sunken | `#EFE7D8` |
| ink | `#1C1714` |
| ink-2 | `#595046` |
| ink-3 | `#968B79` |
| hairline | `#E4DAC8` |
| rule | `#CDC1AB` |
| persimmon (accent) | `#EA4A1F` |
| persimmon-deep (text-safe) | `#BE3A12` |
| persimmon-tint | `#FBE2D6` |
| success | `#2E6B43` |
| warning | `#B7791F` |
| danger | `#B0331F` |

**Colours — Ink (dark)**

| Token | Hex | Use |
|---|---|---|
| canvas | `#15120E` | base background |
| card | `#1F1B15` | surface |
| raised | `#2A251D` | elevated surface |
| hairline | `#322B20` | divider / quiet border |
| rule | `#463D2D` | strong border / clipping edge |
| ink | `#F4EEE2` | primary text |
| ink-2 | `#B4AB99` | secondary text |
| ink-3 | `#7B7363` | tertiary text |
| persimmon | `#FF6A3D` | accent / "verified real customer" mark (text-safe on canvas) |
| persimmon-tint | `#3A2014` | accent wash |
| success | `#5FB572` | granted, saved, paid |
| warning | `#E3A53A` | caution, awaiting |
| danger | `#EE7A63` | error, consent revoked, destructive |

> **Note — persimmon-deep is intentionally omitted in dark.** The bright persimmon (`#FF6A3D`)
> is already text-safe on the dark canvas, so no separate deep (text-safe) variant is needed; in
> Daylight, `persimmon-deep #BE3A12` exists only because the brighter accent fails contrast on
> warm paper.

**Type**

- Display + customer quotes: **Fraunces** (characterful old-style serif) → `--font-display`
- UI: **Hanken Grotesk** (humanist grotesque) → `--font-ui`
- Code / IDs / routes: **JetBrains Mono** → `--font-mono`

**Other tokens**

- Radius: pill `999`, control `8`, clipping (cards) `6`, modal `14`.
- Spacing: 4px base — `4, 8, 12, 16, 24, 32, 48, 64, 96`.
- Elevation: soft single-direction shadow. **No gradients, glow, or blur.**
- Widths: app content max `1240px`; long-form reading `680px`. Breakpoints `480 / 1024 / 1280`.
- Motion: fast `120ms` (hover tint), default `200ms`, celebrate `≤420ms`; easing
  `cubic-bezier(0.2,0,0,1)` — things settle, never bounce. Signature: the **press-run** render
  (a clip card fills bottom-up like ink). Respect `prefers-reduced-motion`.

**Rules**

- **Persimmon appears ONLY on the primary action and the "verified real customer" mark.** Nowhere
  else.
- Strong secondary button = solid **ink**. Quiet secondary = ink hairline outline.
- Real customer faces are shown honestly — **never stock or AI-glossy.**
- Rationale: the restraint is the brand. Persimmon's scarcity is what makes it read as a stamp of
  verification; spending it elsewhere destroys the signal.

### V. Port, Don't Redesign

`/design-reference` (paired HTML + PNG exports) is the **read-only visual contract.** Components are
**ported faithfully** from it.

- Lift the markup and styles into React; swap embedded sample media for real asset references;
  drive from props/fixtures.
- Do **not** reinvent layouts, restyle, or "improve" the design.
- Rationale: the UI already exists and has been designed deliberately. Reinvention introduces drift
  from Principles II and IV and wastes effort re-deciding settled questions.

### VI. Fixtures-First

Build the whole app against a **fixtures dataset shaped exactly like the real DB schema**, behind a
stub session, until the real back end for that slice exists.

- **The fixture shape IS the schema contract.** When real data is wired in, the UI must not need
  rework.
- The schema is written **before** the screens that read it.
- Rationale: fixtures let the full app ship and be reviewed on realistic data while back ends land
  incrementally. Treating the fixture shape as a contract guarantees the swap to real data is
  mechanical, not a redesign.

### VII. Consent Is Sacred (NON-NEGOTIABLE)

Consent is **visible, versioned, and revocable**, threaded through `proof` and every derived
`asset`.

- Consent is captured at submission and versioned.
- **Revocation cascades** to every derived asset. Model this in the first migration.
- **Never generate a clip from proof lacking consent.**
- Rationale: consent is the difference between real proof and exploitation. It is the legal and
  ethical backbone of Principle I, and it must be enforced in data, not just UI.

### VIII. No Editor

The clip studio is a **format picker, never a timeline, track, or scrubber.**

- You act on a piece of proof and choose a format; you do not edit a video.
- The studio opens **from** a piece of proof, not from a nav menu.
- Rationale: the product promise is "no video editor." Any timeline/track/scrubber affordance
  breaks the core promise and the effortless-capture thesis.

### IX. Spec-Driven Development Workflow

Every vertical slice follows the Spec Kit sequence, in order:

1. `/speckit.specify` — write the spec (source of truth; code is the output).
2. `/speckit.plan` — plan the implementation, **with a "don't implement yet" guard.**
3. `/speckit.tasks` — break the plan into tasks.
4. `/speckit.implement` — build it.

- Specs live in `specs/[NNN-slice-name]/`.
- The **build-plan tier order (T0–T10) is the source of truth for sequencing.** Build **ONE
  vertical slice at a time**; do not advance to the next slice or tier until the human explicitly
  says to proceed. After completing a step, **STOP and report** what was done and what's next, then
  wait for approval.
- Rationale: the spec is the contract; sequencing by tier keeps the demo coherent and prevents
  half-built surfaces.

### X. Coding Conventions

- **TypeScript strict:** no `any`; no `@ts-ignore` without a justifying comment.
- **Server Components by default;** Client Components only when interactivity requires it.
- **Filenames kebab-case; components PascalCase.**
- **Zod** for shared validation.
- **Drizzle only** — no raw SQL outside migrations.
- **Tailwind classes only** — no inline styles, no CSS modules.
- **No `localStorage` / `sessionStorage`.**
- Rationale: uniform conventions keep the fixtures-first codebase reviewable and the eventual
  real-data swap mechanical.

### XI. Never-Do Rules

- **Never modify `/design-reference` or `/docs`.** They are read-only references.
- **Never skip spec/plan and jump to implementation.**
- **Never invent features outside the current slice's spec.** No speculative, over-engineered, or
  "while I'm here" additions.
- **Never add a dependency not in the locked stack (Principle III) without proposing it first.**
- **Never use "amazing" / "awesome" or emoji in product microcopy.**
- Rationale: these are the recurring failure modes that quietly erode the brand, the scope, and the
  stack. They are listed as absolutes because each is cheap to violate and expensive to undo.

### XII. Handling Ambiguity — Stop and Ask

When a spec is unclear, or the design does not cover a state, **STOP and ask.** Do not guess or
invent requirements.

- Reference the specific `/design-reference` screen **by name** when raising the question.
- Rationale: guessing produces drift from the design contract and the spec. A clarifying question
  is always cheaper than reworking a wrong build.

## Technology Constraints

The stack in Principle III is binding and enumerated there. In addition:

- **Heavy render never runs on Vercel** (binary/CPU/time limits); it lives in the render worker at
  tier T8. For the demo (Phase 1), the "Generate" action is stubbed to return a pre-made sample
  clip from R2 behind the press-run animation.
- Transcription (AssemblyAI/Deepgram), publishing (Ayrshare), and multi-rail billing are **later
  tiers**, not part of the demo.
- New dependencies require an explicit proposal (Principle XI) and human approval (Principle III).

## Design Tokens

The token tables in Principle IV are the **single source of truth** for colour, type, radii,
spacing, elevation, widths, breakpoints, and motion. Surfaces that show proof are additionally
governed by Principle II (the customer is the headline) and the persimmon-scarcity rule. No
off-token values may be introduced without an amendment to this constitution.

## Governance

This constitution supersedes ad-hoc practice. Where it conflicts with a request, the conflict is
surfaced and resolved with the human before proceeding.

**Amendments.** Changes to this document require explicit human approval. On amendment, bump the
version per semantic versioning and update the dependent Spec Kit templates
(`.specify/templates/plan-template.md`, `spec-template.md`, `tasks-template.md`) so their
Constitution Checks and mandatory sections stay aligned. (Template propagation was intentionally
deferred at initial ratification and is tracked in the Sync Impact Report above.)

**Versioning policy.**
- **MAJOR:** backward-incompatible governance/principle removals or redefinitions.
- **MINOR:** a new principle/section added, or materially expanded guidance.
- **PATCH:** clarifications, wording, and non-semantic refinements.

**Compliance.** Every slice's spec, plan, tasks, and implementation must verify compliance with
these principles. The **definition of done** for a slice: renders on real data (fixtures in
Phase 1); handles empty / loading / error states; responsive to the breakpoints; matches the
Pressroom tokens exactly; keyboard-accessible; passes its acceptance criteria; builds green.
`CLAUDE.md` remains the runtime source of truth for project context; this constitution encodes its
binding rules.

**Version**: 1.0.1 | **Ratified**: 2026-06-12 | **Last Amended**: 2026-06-12
