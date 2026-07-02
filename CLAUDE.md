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

> **Note (provenance).** The design files live in the **Drive `Weavova` folder** (authored by Claude
> Design), not local-only. The repo's `design-reference/` is the working copy.

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
- **T3** Derived-asset surfaces & states — **COMPLETE & shipped to prod** (T3.1 Library + T3.2 clip detail).
  No design-reference clip-detail screen exists, so T3.2 is a **derived surface** (proof-detail 03 layout +
  studio 04 clip framing + render spec); pre-T8 the clip shows as a non-playing labelled "Sample preview"
  still behind the same UI seam the real render swaps into at T8. Empty/loading/error states delivered
  across T2.x + T3.
- **T4** Bulk & exports — campaigns, batch studio, upload, export. **← end of the flowing demo.**
- **T5** Remaining workspace surfaces — brand kits, consent, requests (library shipped at T3.1; the
  **Showcase wall (pre-distribution curate/preview half) shipped** — see T-Showcase; its publish/embed/
  curation cluster is **T9**).
**Forward roadmap (T6→T9) is now governed by `Weavova-T7-T9-Plan-v2`.** Sequence: **T6** (real
auth/workspaces) → **T7** (capture: the `ingest event → request` primitive + generic webhook +
link/QR + Resend; native connectors a phased Sources track; scoped consent; normalize; verification
basis) → **T8** (render: analyze → RenderPlan → validate → assemble → **deterministic render** + a
build-time template-authoring track) → **T9** (distribute/monetize: showcase publish, embed,
campaigns, takedown runbook, billing). T8 retires every "Sample preview" / metadata-card seam. The
render architecture lives in `docs/Weavova-Render-Proof-Spec.md` (v0.3).

**Onboarding (designed — Drive "Onboarding" folder; screens 15 + 17 — now given a planned home):**
- **T6.1 — First-run workspace creation (T6 fast-follow).** A newly authenticated user with **no
  membership** gets a **create-your-first-workspace** flow (name the workspace, become its `owner`).
  T6 itself assumes a pre-seeded workspace; T6.1 is the real new-user path. **Depends on** T6's auth +
  membership schema — the `role` enum already ships at T6, so this is **additive** (no migration; it
  replaces the auto-provision fallback in `src/auth.ts` with a real named-workspace step). Constitution:
  **P-XIII** (no dead controls in the first-run flow), **P-XIV** (owned data only — no fabricated
  starter content).
- **T7 onboarding (scope addition to Capture).** T7 explicitly delivers the **source-connection
  onboarding + empty/pending states**: screen **15** (new workspace / source pending — "connecting;
  proof will start arriving once linked") and screen **17** (empty proof inbox — "connect a source").
  These are the honest **A-11 / P-XIII** "coming"/empty states of the ingestion primitive **before the
  first proof lands**, tied to the `ingest event → request → /c/[token]` primitive and the phased
  **Sources track** already in T7. Constitution: **P-XIII** (empty/pending are honest states, not dead
  ends).

**Current tier: T4 (bulk & exports) next.** Shipped to prod: T0–T2 (the spine, incl. T2.4a schema + T2.4b
studio), **T3 (T3.1 Library + T3.2 clip detail)**, and **the Showcase wall (T-Showcase, pre-distribution
half)**. Deferred to **T9**: the Showcase publish/embed/share/curation cluster + the public site.

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

**Cross-cutting rules (always-on):**
- **Plan-not-code** — runtime emits a validated plan, never composition code (ref spec §1, §4.5).
- **No-LLM-in-render** — render is deterministic after validation.
- **Testimony-verbatim** — the agent decides presentation only; the customer's words are never
  model-authored/altered.
- **A-11** and **FR-019** are now elevated to constitution principles (see the constitution) — no
  dead controls; no fabricated capability or metric (incl. no invented view counts; warmth =
  content-readiness, not a sentiment score).

## 10. Commands

- `npm run dev` — local dev (localhost:3000)
- `npm run build` / `npm run lint`
- `npx drizzle-kit generate` / `migrate` — DB migrations (from T0 step 2)

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/T6.1-signup-workspace-creation/plan.md` (active slice: T6.1 — Signup → Workspace Creation, HARDENING the existing bootstrap, NOT greenfield. A workspace bootstrap ALREADY EXISTS as Auth.js events.createUser in src/auth.ts; this slice fixes four gaps. THE CRUX (Gap 2): move the bootstrap from events.createUser (fire-once-at-user-creation) to events.signIn (fires per SIGN-IN, provider-agnostic magic-link AND Google, user.id present on DB-session strategy) → a guarded, self-healing "create-workspace-if-user-has-ZERO-memberships": fires for brand-new users AND repairs stranded membership-less users on next sign-in; no-op for anyone with ≥1 membership (seeded Lumen owner untouched). IDEMPOTENCY/RACE (central concern): deterministic per-user slug = base(email)+"-"+FULL user.id, created INSIDE getDb().batch([insert workspace, insert membership owner]) — neon-http batch = one transaction (Gap 1 ATOMICITY, no orphan). Concurrent double-fire: 2nd batch violates workspace_slug_unique → aborts in full → loser catches unique-violation and treats as success. membership unique(userId,workspaceId)+onConflictDoNothing belt-and-suspenders. Gap 3 NAMING: firstName ? "{firstName}'s workspace" : "{email local-part}'s workspace" (users.name nullable, email not-null). Gap 4 THE FLAG: ONE additive migration (drizzle/0011) adds workspace.onboarded_at timestamptz NULL — NULL=not-yet-onboarded (bootstrap leaves NULL), SEED sets Lumen onboarded_at (already-onboarded so wizard never treats demo as new); no backfill (existing prod bootstrapped rows stay NULL = correct). Future onboarding WIZARD (business-type/source/brand/format, Drive screens 15/17) reads the flag — OUT OF SCOPE here (separate later slice), NOT ported. EMPTY STATES = VERIFY-not-build: DashboardEmpty/InboxEmpty/requests-grid/LibraryEmpty/ShowcaseEmpty/consent-empty/brand-kit-defaults ALL confirmed present; verify each renders honestly for a genuinely-empty new workspace (no seeded data, no error); any surface assuming seeded data = P-XIII flag-and-surface, not a redesign. BYTE-STABLE (FR-009): src/lib/session.ts NOT edited — getCurrentWorkspace SELECTs an explicit column list, so onboarded_at does NOT enter it; Workspace return shape unchanged, all consumers stable; new user's membership resolves via the SAME membership⨝users⨝workspace join as the seed. TOUCH POINTS (nothing else): src/db/schema.ts (workspace.onboardedAt additive), drizzle/0011 (ALTER TABLE ADD COLUMN nullable), src/auth.ts (createUser→signIn bootstrap), src/db/seed.ts (Lumen onboarded_at set). CORES FROZEN (P-V): T6 auth schema users/workspace/membership, session/workspace seam, capture/consent/verification — STOP if a core needs real change. NO NEW DEP (reuse Auth.js v5 + Drizzle/Neon; app stays 11). Constitution: P-V (T6 seam reused, additive, seed+requireWorkspace byte-stable), P-XIII (honest empty states, onboarded_at is real plumbing not decorative), P-XIV (new workspace genuinely empty, no fabricated starter data), P-III (no new dep/provider), P-XV/XVI N/A (non-render). PLAN + research(D1 hook=events.signIn, D2 idempotency/race, D3 account-linking, D4 naming, D5 flag+seed, D6 byte-stability, D7 empty-state inventory)/data-model(1 additive column, no other change)/contracts(bootstrap-on-signin + empty-state-verification)/quickstart(7 scenarios A–G) done. No open [NEEDS CLARIFICATION] (4 decisions settled: auto-create/naming/flag/verify-not-build). PRIOR SHIPPED: T7.4a consent-media remediation + T7.4 increments 1+2 (committed); T6 real auth/workspaces; T0–T3 + Showcase wall to prod.)
<!-- SPECKIT END -->
