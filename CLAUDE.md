# CLAUDE.md — Weavova

This file is the source of truth for the project. Read it fully at the start of every session.
The Spec Kit constitution (`.specify/memory/constitution.md`) is derived from it. If anything here
conflicts with a request, surface the conflict and ask before proceeding.

---

## 1. What Weavova is

Weavova captures a business's **real customer proof** the moment a sale, booking, or delivery
happens, and turns it into post-ready social content — short vertical clips, carousels, and
embeddable proof blocks — **with no video editor**. It is counter-positioned against the wave of
synthetic AI-UGC tools: the scarce, converting asset is *real, verified, consented human proof*,
and the product's job is to make capturing and reshaping it effortless.

## 2. How the app works (the loop)

The product is a loop, not a page tree: **Capture → Review → Transform → Distribute**, wrapped by
one-time setup and threaded throughout by consent.

- **Capture lives OUTSIDE the app** — it's the customer's page (`/c/[token]`), no login, mobile-first,
  wearing the merchant's brand. Triggered automatically by a connected source.
- **The studio opens FROM a piece of proof**, not from a nav menu. You act on proof; you don't
  "go make a video."
- **Consent** is captured at submission, versioned, revocable; revocation **cascades** to every
  derived asset.
- **The public showcase** feeds growth (output becomes acquisition).

## 3. Tech stack — LOCKED (do not deviate without explicit human approval)

- **Framework:** Next.js 15 (App Router), React 19, TypeScript (strict). Deploy on **Vercel**.
- **Styling:** Tailwind v4 + the Pressroom tokens (section 5). Fonts via `next/font/google`.
- **Auth:** **Auth.js / NextAuth v5** with the Drizzle adapter. **NOT Supabase Auth.**
- **Database:** **Neon** Postgres + **Drizzle ORM** + drizzle-kit migrations.
- **Object storage (video/media):** **Cloudflare R2** (S3-compatible), presigned multipart uploads.
  Chosen for zero egress fees.
- **Jobs:** **Inngest** (durable async steps: generate / transcribe / publish).
- **Email:** **Resend** (magic links + notifications).
- **Render worker:** FFmpeg + Revideo on Railway/Fly — **LATER (tier T8)**. It cannot run on Vercel.
- **Transcription / publishing / payments:** AssemblyAI/Deepgram, Ayrshare, multi-rail billing — **later**.

**For the demo (Phase 1), rendering is STUBBED**: a "Generate" action runs the press-run animation
and returns a pre-made sample clip from R2. The real engine is swapped in behind the same UI at T8.

## 4. Architecture principles

- **Fixtures-first.** Build the whole app against a fixtures dataset shaped *exactly* like the real
  DB schema, behind a stub session, until the real back end for that slice exists. **The fixture
  shape is the schema contract** — when real data is wired in, the UI must not need rework.
- **The schema is written before the screens that read it.**
- **Consent threads through `proof` and every derived `asset`; revocation cascades.** Model this in
  the first migration. Never allow generating a clip from proof lacking consent.
- **Heavy render never runs on Vercel** (binary/CPU/time limits) — it lives in the worker (T8).

## 5. Design system — "Pressroom" (tokens are the single source of truth)

Concept: a warm, editorial product where **the customer is the headline**. Warm paper and ink, one
hot persimmon accent used like an inked stamp, tactile not flat. The chrome is quiet; the proof is loud.

**Colours — Daylight (light, default)**
`paper #F4F1E8` · `card #FEFDF8` · `sunken #E9E5D6` · `ink #1C1714` · `ink-2 #595046` ·
`ink-3 #968B79` · `hairline #E4DAC8` · `rule #CDC1AB` · `persimmon (accent) #B5443C` ·
`persimmon-deep (text-safe) #8F342E` · `persimmon-tint #F5DFD8` · `on-accent #FFFFFF` ·
`success #2E6B43` · `success-tint #E3EDE3` · `warning #B7791F` · `warning-tint #F4EBD7` ·
`danger #B0331F` · `danger-tint #F3DED8`
(Daylight colours reconciled from `/design-reference` — the authoritative colour source — at
constitution v1.1.0.)

**Colours — Ink (dark)**
`canvas #15120E` · `card #1F1B15` · `raised #2A251D` · `hairline #322B20` · `rule #463D2D` ·
`ink #F4EEE2` · `ink-2 #B4AB99` · `ink-3 #7B7363` · `persimmon #CA5F51` · `persimmon-tint #3A261F` ·
`on-accent #FFFFFF` · `success #5FB572` · `success-tint #293424` · `warning #E3A53A` ·
`warning-tint #3E311B` · `danger #EE7A63` · `danger-tint #402A21`
(persimmon-deep is intentionally omitted in dark: the dark persimmon `#CA5F51` is already text-safe
on the dark canvas, so no separate deep variant is needed. At v1.1.0 the dark persimmon and
persimmon-tint were re-derived from the new Daylight accent `#B5443C`, and the dark status tints are
16% washes of each status colour over the dark card `#1F1B15`; the export has no dark screens.)

**Type**
- Display + customer quotes: **Fraunces** (characterful old-style serif) → `--font-display`
- UI: **Hanken Grotesk** (humanist grotesque) → `--font-ui`
- Code / IDs / routes: **JetBrains Mono** → `--font-mono`
- Scale (size/lh px, reconciled from `/design-reference` at v1.1.1): display-2xl `48/52`,
  display-xl `38/44`, display-lg `30/36`, display-md `24/30`, display-sm `20/26`, display-xs `18/24`
  (Fraunces) · heading-lg `20/28`, heading-md `16/22`, heading-sm `14/20` (Hanken) · quote `22/32`
  (Fraunces) · body `15/24`, body-sm `13/20`, label `11/16` uppercase (Hanken) · mono `12/18`,
  mono-sm `11/16` (JetBrains).

**Other tokens**
- Radius: pill `999`, control `8`, clipping (cards) `6`, modal `14`.
- Spacing: 4px base (4, 8, 12, 16, 24, 32, 48, 64, 96).
- Elevation: soft single-direction shadow (named tokens, reconciled at v1.1.1; `rgba(28,23,20)` =
  ink): `--shadow-clip 2px 3px 10px -4px rgba(28,23,20,.14)` (cards/clipping), `--shadow-lift 6px
  10px 26px -10px rgba(28,23,20,.26)` (hover), `--shadow-modal 10px 18px 50px -16px
  rgba(28,23,20,.34)` (modals). **No gradients, glow, blur, or inset.**
- Widths: app content max `1240px`; long-form reading `680px`. Breakpoints `480 / 1024 / 1280`.
- Motion: fast `120ms` (hover tint), default `200ms`, celebrate `≤420ms`; easing
  `cubic-bezier(0.2,0,0,1)` — things settle, never bounce. Signature: the **press-run** render
  (a clip card fills bottom-up like ink). Respect `prefers-reduced-motion`.

**Rules**
- Persimmon appears ONLY on the primary action and the "verified real customer" mark.
- Strong secondary button = solid **ink**. Quiet secondary = ink hairline outline.
- Real customer faces shown honestly, never stock or AI-glossy.

## 6. /design-reference — the UI already exists (PORT, do not redesign)

The full core-app UI is in `/design-reference` as paired **HTML + PNG** exports. **Treat this folder
as read-only.** Port components from it faithfully — lift the markup and styles into React, swap
embedded sample media for real asset references, and drive from props/fixtures. Do **not** reinvent
layouts, restyle, or "improve" the design.

| Folder | Screens |
|---|---|
| The spine | 01 Dashboard · 02 Proof inbox · 03 Proof detail · 04 Clip studio |
| The Workspace | 05 Collection requests · 06 Request builder · 07 Campaigns · 08 Campaign detail · 09 Library · 10 Showcase manager · 11 Brand kits · 12 Brand kit editor · 13 Consent & rights |
| Global | 14 Command palette (⌘K) |
| Derived surfaces & states | 15 New-workspace/source-pending · 16 Loading skeletons · 17 Empty inbox · 18 Proof picker · 19 New campaign builder · 20 Publish dialog · 21 Make embed · 22 Make carousel · 23 Ask for more · 24 Workspace switcher · 25 New brand kit |
| Bulk & exports | B1 Batch studio · B2 Add proof (upload) · B3 Warmth sort · B4 Export |
| Authentication · Onboarding · Settings · Public site · System · Logos | later tiers |

## 7. Sitemap (routes)

Core app (`/app`, authenticated): `/app` (dashboard) · `/app/proof` · `/app/proof/[id]` ·
`/app/proof/[id]/studio` (overlay) · `/app/requests` (+`/new`) · `/app/campaigns` (+`/[id]`) ·
`/app/library` · `/app/showcase` · `/app/brand` (+`/[id]`) · `/app/consent` · `⌘K` palette.
Capture (no login, outside chrome): `/c/[token]`.
Public: `/` · `/pricing` · `/faq` · `/about` · `/contact` · `/blog[/slug]` · `/changelog` ·
`/showcase[/slug]` · `/lifetime` · `/legal/*`.
Auth: `/login` · `/signup` (+`/workspace`) · `/verify` · `/forgot` · `/reset/[token]` · `/auth/callback`.
Onboarding: `/onboard/(role|source|brand|format)`.
Settings: `/settings/(profile|notifications|billing|team|api|integrations[/provider])`.
System: `/404` · `/500` · `/maintenance` · `/success/[type]` · `/admin`.

## 8. Build plan — where we are and what's next

Phases: **0** Foundations → **1** Demo (core app on fixtures) → **2** Identity → **3** Capture →
**4** Media engine → **5** Distribute → **6** Launch.

Tiers:
- **T0** Foundations & rails — scaffold, tokens, schema + fixtures, auth stub, R2 helper, Inngest/Resend, deploy.
- **T1** Workspace shell — rail, top bar, workspace switcher (24), command palette (14).
- **T2** The spine — Dashboard → Proof inbox → Proof detail → Clip studio; stubbed generate → sample clip.
- **T3** Derived surfaces & states — empty / loading / error / render-in-progress.
- **T4** Bulk & exports — campaigns, batch studio, upload, export. **← end of the flowing demo.**
- **T5** Remaining workspace surfaces — library, showcase, brand kits, consent, requests.
- **T6** Identity — real Auth.js, workspaces, onboarding (**first real data**).
- **T7** Capture — collection page + sources (**first real customer proof**).
- **T8** Media engine — real render worker (FFmpeg + Revideo), formats, R2 pipeline.
- **T9** Monetise & distribute — billing, settings, publishing, public site.
- **T10** System, polish & launch.

**Current tier: T0.**

## 9. Way of working — Spec-Driven Development + guardrails

We use **Spec Kit** driving Claude Code. Commands: `/speckit.constitution`, `/speckit.specify`,
`/speckit.clarify`, `/speckit.plan`, `/speckit.tasks`, `/speckit.implement`. The **spec is the
source of truth**; code is the output.

**Definition of done (every slice):** renders on real data (fixtures in Phase 1), handles
empty/loading/error, responsive to the breakpoints, matches the Pressroom tokens exactly,
keyboard-accessible, passes its acceptance criteria, builds green.

**Guardrails — these are binding:**
- Build **ONE vertical slice at a time.** Do **NOT** advance to the next slice or tier until the
  human explicitly says to proceed.
- After completing a step, **STOP and report** what you did and what's next; wait for approval.
- Do **NOT** deviate from the locked stack (section 3) or the Pressroom tokens (section 5) without
  asking first.
- When a spec is ambiguous, **stop and ask** — do not guess or invent requirements.
- Keep every change scoped to the current slice. **No speculative, over-engineered, or "while I'm
  here" additions.**
- **Never modify `/design-reference`.**
- Don't introduce new dependencies without flagging them and why.

## 10. Commands

- `npm run dev` — local dev (localhost:3000)
- `npm run build` / `npm run lint`
- `npx drizzle-kit generate` / `migrate` — DB migrations (from T0 step 2)

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/T1-workspace-shell/plan.md` (active slice: T1 — Workspace shell).
<!-- SPECKIT END -->
