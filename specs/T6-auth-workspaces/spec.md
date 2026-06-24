# Feature Specification: Real authentication + workspaces (T6)

**Feature Branch**: `T6-auth-workspaces`

**Created**: 2026-06-25

**Status**: Draft — **clarifications RESOLVED** (Q1–Q4 settled 2026-06-25; see "## Clarifications").
Ready for `/speckit-plan`.

**Tier**: T6 — Identity. The first tier with **real data** behind the app: real authentication + a
workspace/membership model, replacing the stub session every surface has run on since T1.

**Input**: User description: "T6 — Real authentication + workspaces. … retires the stub session seam …
and replaces it with real auth + a workspace/membership model — a PORT of the seam, not a redesign of
the surfaces (Principle V). … Auth.js v5 + Drizzle adapter, magic-link via Resend + Google OAuth, link
by verified email, byte-stable seam swap, seed a real demo user + workspace that OWNS the existing
seeded proof. P-VII unchanged."

**Ported from**: the **Auth** screens named in CLAUDE.md §6/§7 ("Authentication · Onboarding … later
tiers") — `/login`, `/verify` (magic-link sent / check-your-email), `/auth/callback`. Per **P-IV
Provenance** and the constitution's **stale-screens** note, any Auth export still on the old warm
palette is **stale**: it is ported onto the **current unified Pressroom tokens**, not the colours baked
into its export. This slice is a **port of the session seam**, not a redesign of the authenticated
surfaces — those keep their shipped layout and only change **where they read identity** (P-V).

---

## Overview

Every authenticated surface shipped so far (dashboard, proof inbox, proof detail, clip studio, library,
consent, brand kit, showcase) reads identity from a **stub session** — a hardcoded "Maya K. / Lumen
Candle Co." From T1 this was the deliberate fixtures-first seam (P-VI): build the whole app against a
stub, swap real auth in later **behind the same seam**. T6 performs that swap.

**What this slice delivers:**
- **Real authentication** (Auth.js v5 + the Drizzle adapter — the locked stack choice) with **two
  providers**: an **email magic-link** (delivered by Resend) and **Google OAuth**.
- A **users / workspaces / memberships** schema that replaces the hardcoded stub identity with real,
  persisted identity and a workspace a user belongs to.
- **Account linking by verified email**: the same verified email — whether it arrives via magic-link or
  Google — resolves to **one** user, never two accounts.
- **Auth UI**: a sign-in surface offering both provider paths; a "magic-link sent / check your email"
  state; a post-auth landing into the app; and sign-out.
- A **byte-stable seam swap**: the session-read helper that surfaces already call becomes the **real**
  session. Surfaces change **only where they read identity** — nowhere else. The dashboard, inbox, proof
  detail, studio, library, consent, and brand kit keep working unchanged, now scoped to the real
  workspace.
- **Fixture reconciliation**: seed a **real demo user + workspace that OWNS the existing seeded proof**,
  so the demo stays coherent after auth lands — no orphaned fixtures, no proof without an owner.

**What this slice is NOT:** a redesign of any authenticated surface; a change to the consent model
(P-VII is unchanged — consent reads are unaffected by the auth swap); the render engine (T8); capture
or sources (T7); billing or settings (T9). It is the **identity layer** the rest of the app has been
waiting behind a stub for.

**The honest "coming" boundary (P-XIII):** any auth-adjacent control the reference depicts but this
slice does not yet back (e.g. **team invites**, deferred to a fast-follow — FR-019) is shown as an
**honest "coming" state**, never a dead control wired to nothing.

**Owned data only (P-XIV):** the auth UI shows only **real** identity data — no fabricated user counts,
workspace counts, member lists, or activity numbers.

---

## Clarifications

### Session 2026-06-25

- Q: Roles at v1 — owner-only, or owner/member? → A: **Owner / member.** The memberships table carries
  a `role` column (`owner | member`) from the first migration. v1 enforcement is minimal — an owner may
  do everything; a member has **read + create-clip** and no destructive/admin actions (no delete, no
  workspace/billing settings, no member management). The role column is near-free now and avoids a
  migration the moment a second person joins.
- Q: Team invites — in T6, or fast-follow? → A: **Fast-follow** (not in T6). No invitation token /
  accept-decline flow this slice; workspace settings shows an honest **"Invite teammates — coming soon"**
  affordance (P-XIII), not a hidden gap and not a dead button. The owner/member schema lets invites slot
  in later with zero rework.
- Q: Route-protection model — middleware gate vs per-route checks? → A: **Middleware gate on `/app/*`**
  (unauthenticated → redirect to sign-in), **with workspace-scoped reads as a required defense-in-depth
  invariant** — middleware protects routes only, so every data loader / Server Action must also scope its
  queries to the session's workspace. Both layers are required for multi-tenant safety.
- Q: Unauthenticated `/` — marketing/sign-in surface or redirect? → A: **Redirect to sign-in.**
  Unauthenticated `/` → sign-in; authenticated `/` → dashboard (`/app`). A real marketing landing is a
  separate Public-site surface, out of scope for T6.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in with an email magic link (Priority: P1)

A merchant enters their email on the sign-in surface, receives a magic-link email (via Resend), clicks
it, and lands authenticated inside the app — seeing their own workspace's data, not a stub identity.

**Why this priority**: Magic-link is the passwordless primary path and the one that reuses the Resend
provisioning T7 also needs. Without a working sign-in, no authenticated surface is reachable on real
data — this is the MVP of the tier.

**Independent Test**: From signed-out, enter an email, observe the "check your email" state, follow the
link, and confirm arrival at the authenticated landing as that real user.

**Acceptance Scenarios**:

1. **Given** the signed-out sign-in surface, **When** the merchant submits a valid email, **Then** a
   magic-link email is sent and the UI shows an honest "magic-link sent / check your email" state naming
   the address it went to.
2. **Given** a valid, unexpired magic link, **When** the merchant opens it, **Then** they are
   authenticated and land in the app as their real user, scoped to their real workspace.
3. **Given** an expired or already-used link, **When** the merchant opens it, **Then** an honest error
   state is shown with a way to request a new link (no silent failure, no broken page).

---

### User Story 2 - Sign in with Google (Priority: P1)

A merchant chooses "Continue with Google", completes Google's OAuth flow, and lands authenticated in the
app as their real user.

**Why this priority**: Google OAuth is the second required provider and the one-click path; it is part
of the MVP sign-in surface alongside magic-link.

**Independent Test**: From signed-out, choose Google, complete the OAuth consent, and confirm arrival at
the authenticated landing as the real user.

**Acceptance Scenarios**:

1. **Given** the sign-in surface, **When** the merchant chooses "Continue with Google" and completes the
   OAuth flow, **Then** they are authenticated and land in the app as their real user.
2. **Given** a Google sign-in whose **verified email matches an existing user** (created via magic-link
   or a prior Google sign-in), **When** the flow completes, **Then** it resolves to the **same single
   user** — never a second account (account linking by verified email).
3. **Given** the merchant cancels or denies the Google consent, **When** they return, **Then** an honest
   "sign-in not completed" state is shown on the sign-in surface (no error dump, no half-session).

---

### User Story 3 - The whole app runs on the real session, scoped to the real workspace (the seam swap) (Priority: P1)

Once signed in, every existing surface — dashboard, proof inbox, proof detail, clip studio, library,
consent, brand kit, showcase — works exactly as it did on the stub, now reading the **real** session and
showing the **real workspace's** data. An unauthenticated visitor cannot reach these surfaces.

**Why this priority**: The seam swap is the whole point of the tier — real identity behind the surfaces
without redesigning them. If any surface breaks or leaks another workspace's data, the swap has failed.

**Independent Test**: Signed in as the seeded demo user, visit each authenticated surface and confirm it
renders the demo workspace's data (the proof it now owns) unchanged in layout; then, signed out, confirm
those surfaces are not reachable.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they open any authenticated surface, **Then** it renders that
   user's **workspace-scoped** data through the same session-read seam — with **no layout/visual change**
   from the stub version (P-V, byte-stable).
2. **Given** the seeded demo user + workspace, **When** the app loads, **Then** the existing seeded proof
   is **owned by that workspace** (no orphaned fixtures) and appears exactly as before.
3. **Given** an **unauthenticated** visitor, **When** they request an authenticated route (`/app/*`),
   **Then** the middleware gate sends them to sign-in and they cannot view workspace data (FR-008).
4. **Given** a signed-in user, **When** any surface reads identity, **Then** it reads it from the real
   session helper — **not** the hardcoded stub — and the stub identity ("Maya K. / Lumen Candle Co.") no
   longer appears anywhere except as the seeded **real** demo identity.

---

### User Story 4 - Sign out (Priority: P2)

A signed-in merchant signs out and is returned to a signed-out state; their session no longer grants
access to authenticated surfaces.

**Why this priority**: Sign-out completes the session lifecycle and is required for a real auth surface,
but it depends on sign-in existing first, so P2.

**Independent Test**: Signed in, trigger sign-out, confirm return to the signed-out state and that
authenticated routes are no longer reachable without signing in again.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they sign out, **Then** the session ends and they are returned
   to the signed-out entry (sign-in, per FR-020).
2. **Given** a signed-out user (post sign-out), **When** they request an authenticated route, **Then**
   they are sent to sign-in (no stale session access).

---

### User Story 5 - One identity across providers (account linking) (Priority: P2)

A merchant who first signed in with a magic link can later sign in with Google using the same verified
email (or vice versa) and reach the **same** account and workspace — not a duplicate.

**Why this priority**: Linking prevents the classic duplicate-account split. It is a correctness
guarantee on top of the two P1 sign-in paths, so P2.

**Independent Test**: Create a user via magic-link, sign out, sign in with Google using the same verified
email, and confirm the same user/workspace — one account, one set of data.

**Acceptance Scenarios**:

1. **Given** a user created via magic-link with email X, **When** they later sign in with Google whose
   verified email is X, **Then** both resolve to the **same single user** (linked by verified email).
2. **Given** the linked user, **When** they view the app under either provider, **Then** they see the
   **same workspace and data** — no fork, no second workspace.

---

### Edge Cases

- **Expired / reused / tampered magic link**: honest error + "request a new link"; never a broken page
  or a partial session.
- **Google email unverified by Google**: not silently linked to an existing account on an unverified
  address (linking is by **verified** email only) — handled honestly rather than creating a risky link.
- **Unauthenticated access to `/app/*`**: redirected to sign-in by the middleware gate (FR-008); no
  flash of workspace data.
- **Already-signed-in user hits the sign-in surface**: sent into the app rather than shown a redundant
  sign-in (no dead end).
- **A user with no workspace yet** (should not occur for the seeded demo, but possible for a brand-new
  real sign-up): handled honestly — either provisioned a workspace or shown an honest "setting up"
  state, never an empty broken app. *(Onboarding proper is a later tier; this is the minimum honest
  state.)*
- **Resend not provisioned in a dev/CI environment**: the magic-link request reports an honest failure;
  the build stays green without live email creds.
- **Invites affordance**: workspace settings shows an honest **"Invite teammates — coming soon"** state
  (invites are deferred to a fast-follow — FR-019), never a dead button (P-XIII).
- **Stub identity leakage**: after the swap, the hardcoded "Maya K. / Lumen Candle Co." string exists
  only as the **seeded real** demo data — not as a fallback rendered when a session is missing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST authenticate users with **Auth.js v5 + the Drizzle adapter** (the locked
  stack), offering **two providers**: an **email magic-link** and **Google OAuth**.
- **FR-002**: The magic-link email MUST be delivered via **Resend** (the same Resend provisioned for T7
  requests). The sign-in surface MUST show an honest **"magic-link sent / check your email"** state after
  a request.
- **FR-003**: The system MUST resolve the **same verified email** to **one** user regardless of provider
  (magic-link or Google) — **account linking by verified email**, never two accounts for one verified
  address. Linking MUST key on a **verified** email only.
- **FR-004**: The slice MUST add a **users / workspaces / memberships** data model (additive migration)
  that replaces the hardcoded stub identity with real persisted identity and the workspace a user
  belongs to.
- **FR-005**: The **session-read helper** that authenticated surfaces already call MUST become the
  **real** session source. Surfaces MUST change **only** where they read identity — **byte-stable**
  everywhere else (no layout, copy, or behaviour change). (P-V)
- **FR-006**: Every authenticated surface (dashboard, proof inbox, proof detail, clip studio, library,
  consent, brand kit, showcase) MUST keep working on the real session, rendering **workspace-scoped**
  data, with no visual/layout regression from the stub version.
- **FR-007**: The seed MUST create a **real demo user + workspace** that **OWNS the existing seeded
  proof**, so no fixture is orphaned after auth lands; the demo MUST stay coherent (the proof appears as
  before, now owned).
- **FR-008**: **Unauthenticated** requests to authenticated routes (`/app/*`) MUST be denied by a
  **single middleware gate** that redirects to sign-in, with **no flash** of workspace data.
- **FR-009**: The system MUST provide **sign-out** that ends the session and returns the user to the
  signed-out entry; a post-sign-out session MUST NOT grant access to authenticated routes.
- **FR-010**: The auth UI (sign-in with both paths, "check your email" state, post-auth landing,
  sign-out, and any auth-error states) MUST be **ported faithfully** onto the **current unified Pressroom
  tokens** (stale-palette Auth exports are reconciled to current tokens, not their baked colours). (P-V,
  P-IV)
- **FR-011**: Every rendered auth control MUST genuinely work or be an **honest "coming" state** — e.g.
  team **invites**, if deferred (Q2), MUST be a labeled "coming" state, **never a dead control**.
  (P-XIII)
- **FR-012**: The auth UI MUST show only **real** identity data — **no fabricated** user/workspace counts,
  member lists, or activity metrics. (P-XIV)
- **FR-013**: The **consent model is unchanged** (P-VII): consent records, versioning, revocation, and
  every consent read MUST behave identically before and after the auth swap. The only consent-relevant
  change is that consent reads are now **scoped to the real workspace** via the same seam.
- **FR-014**: Authenticated data reads MUST be **scoped to the signed-in user's workspace** — a user MUST
  NOT see another workspace's proof, clips, library, consent, or brand kit.
- **FR-015**: The slice MUST keep the **non-identity** code paths byte-stable: `ProofCard`, the proof /
  clip / showcase / consent / brand-kit **read shapes**, `generateClip`, `generateBatch`, and the nav
  rail change **only** where they read identity (e.g. resolving the current workspace), not in structure
  or output.
- **FR-016**: The slice MUST add **no dependency outside the locked stack**; Auth.js v5, the Drizzle
  adapter, Resend, and the Google OAuth provider are within it. The build MUST stay green in an
  environment **without** live OAuth/Resend creds (auth actions fail honestly; the app still builds).
- **FR-017** *(Q3 — defense in depth)*: Multi-tenant safety MUST be enforced in **two layers**: the
  `/app/*` middleware gate (FR-008) protects **routes**, and **every data loader and Server Action MUST
  additionally scope its queries to the session's workspace** (FR-014). Middleware alone does not prevent
  cross-workspace reads; **both** layers are required. A new authenticated route or action is not
  complete until it scopes its own reads/writes to the workspace.
- **FR-018** *(Q1 — roles)*: Membership MUST carry a **role** of **`owner`** or **`member`** from the
  first migration. v1 enforcement is minimal: an **owner** may perform every action; a **member** has
  **read + create-clip** only and MUST NOT perform destructive or administrative actions (no delete, no
  workspace/billing settings, no member management). Roles are stored now even though invites are deferred
  (FR-019), so multi-member support lands later as additive UI with **no** further migration.
- **FR-019** *(Q2 — invites deferred)*: Team **invites are out of scope** for T6 (no invitation token /
  accept-decline flow). Workspace settings MUST show a visible, honest **"Invite teammates — coming
  soon"** affordance — a labeled "coming" state, **not** a hidden gap and **not** a dead button (P-XIII).
- **FR-020** *(Q4 — landing)*: An **unauthenticated** request to `/` MUST redirect to **sign-in**; an
  **authenticated** request to `/` MUST go to the **dashboard** (`/app`). A real marketing landing is a
  separate Public-site surface, out of scope for T6.
- **FR-021** *(P-V — the seam-swap consumer contract)*: The seam swap MUST keep **every** consumer of
  the stub session identity working — **byte-stable except for the identity read**. Every consumer routes
  through `getSession()` / `getCurrentWorkspace()` in `src/lib/session.ts` (the single seam); no surface
  hardcodes a workspace id or reads the db directly. The complete, code-verified consumer set is
  enumerated in **"Seam-swap consumers"** below; the swap is not complete until **all** of them render /
  act identically on the real session.

### Seam-swap consumers *(byte-stable except the identity read — P-V, FR-021)*

Verified against the codebase (every entry calls `getSession()` and/or `getCurrentWorkspace()`):

**Pages / Server Components**
- **App shell + workspace switcher + user menu** — `src/app/app/layout.tsx` (reads **both**
  `getSession()` for the user identity/`UserMenu` and `getCurrentWorkspace()` for the workspace switcher).
- **Dashboard** — `src/app/app/page.tsx` (+ `src/components/app/dashboard/dashboard-body.tsx`, which
  reads `getSession()` directly for the greeting).
- **Proof inbox** — `src/app/app/proof/page.tsx`.
- **Proof detail** — `src/app/app/proof/[id]/page.tsx`.
- **Clip studio** — `src/app/app/proof/[id]/studio/page.tsx`.
- **Clip detail** — `src/app/app/clip/[id]/page.tsx`. *(ADDED — not in the supplied minimum list.)*
- **Library** — `src/app/app/library/page.tsx`.
- **Consent ledger** — `src/app/app/consent/page.tsx`.
- **Brand kit** — `src/app/app/brand/page.tsx`.
- **Footage store (B2)** — `src/app/app/footage/page.tsx`. *(ADDED.)*
- **Showcase wall** — `src/app/app/showcase/page.tsx`.

**Server Actions (assume the stub workspace today)**
- **Single clip generation** — `src/app/app/proof/[id]/studio/actions.ts` (`generateClip`) and
  `src/app/app/proof/[id]/actions.ts`.
- **Batch generation + add proof** — `src/app/app/proof/actions.ts` (`generateBatch`).
- **Warmth sort (B3)** — `src/app/app/proof/warmth-actions.ts`. *(ADDED.)*
- **Export (B4)** — `src/app/app/library/actions.ts` (`exportClips`).
- **Consent withdrawal** — `src/app/app/consent/actions.ts`.
- **Brand-kit save + logo presign** — `src/app/app/brand/actions.ts`. *(ADDED.)*
- **Footage add/upload (B2)** — `src/app/app/footage/actions.ts`. *(ADDED.)*

**Coupled, must stay coherent (flagged for the plan)**
- **Error boundary** — `src/app/error.tsx` documents its coupling to `getCurrentWorkspace()` throwing;
  its behaviour must remain coherent after the swap.
- **Styleguide data page** — `src/app/styleguide/data/page.tsx` reads `getCurrentWorkspace()` but is
  **NOT** under `/app/*`, so the FR-008 middleware gate does **not** cover it. The plan MUST decide its
  fate (keep it working on a seeded/default workspace, gate it, or mark it dev-only) — it must not break
  the build or silently 500 when the seam becomes session-backed. *(FLAGGED — a real consumer outside the
  protected tree.)*

### Key Entities *(include if feature involves data)*

- **User (new)**: a real authenticated person — a verified email (the linking key), display name, and
  optional avatar. Replaces the stub identity. One user per verified email.
- **Workspace (new)**: the tenant a user's data belongs to — name (the seeded demo = "Lumen Candle Co."),
  the owner of proof, clips, library, consent, and brand kit. Every authenticated read is scoped to a
  workspace.
- **Membership (new)**: the link between a user and a workspace, carrying the user's **role** —
  **`owner` | `member`** (FR-018). Owner: full access. Member: read + create-clip only, no
  destructive/admin actions. The role column ships in the first migration even though invites are
  deferred (FR-019).
- **Auth.js-managed records (new, adapter-owned)**: the account (per-provider identity), session, and
  verification-token records the Drizzle adapter persists. Provider accounts attach to the single linked
  user (FR-003).
- **Existing entities (read shape untouched)**: `proof`, `consent`, `derived_asset`, `brand_asset`,
  `brand_kit`, showcase data — now **owned by a workspace** and read **scoped to it**, but their shapes
  and the surfaces reading them are unchanged (P-V). The seeded proof becomes owned by the demo
  workspace (FR-007).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new merchant can go from the signed-out sign-in surface to authenticated-inside-the-app
  via **either** provider (magic-link or Google) — **both** paths succeed end to end.
- **SC-002**: Signing in with the same verified email across both providers yields **exactly one** user
  and **one** workspace — **0** duplicate accounts.
- **SC-003**: After the swap, **100%** of the authenticated surfaces render unchanged in layout from the
  stub version (port fidelity) while showing **real workspace-scoped** data — **0** surfaces broken by
  the swap.
- **SC-004**: An unauthenticated visitor reaches workspace data in **0%** of attempts on `/app/*`
  (always routed to sign-in, no data flash).
- **SC-005**: The existing seeded proof is owned by the demo workspace in **100%** of cases — **0**
  orphaned fixtures after auth lands.
- **SC-006**: Consent behaviour (records, versioning, revocation, reads) is **identical** before and
  after the swap — **0** consent-behaviour regressions (P-VII).
- **SC-007**: The auth UI displays **0** fabricated counts/metrics and **0** dead controls (any deferred
  capability is a labeled "coming" state).
- **SC-008**: The slice adds **0** dependencies outside the locked stack and the build is green **without**
  live OAuth/Resend creds (CI parity).

## Constitution Alignment *(mandatory)*

Checked against `.specify/memory/constitution.md` (v1.4.0).

- **Customer is the headline (P-II)**: N/A on the auth surfaces themselves (sign-in shows no customer
  proof). The authenticated surfaces that *do* show proof keep their shipped, headline-respecting layout
  unchanged (P-V) — the swap touches identity reads, not proof presentation.
- **Locked stack (P-III)**: uses **Auth.js v5 + Drizzle adapter**, **Resend**, **Google OAuth**, Neon +
  Drizzle — all within the locked stack; **NOT** Supabase Auth. **No new dependency.** No heavy render
  involved.
- **Pressroom tokens (P-IV)**: the auth UI uses only on-token colour/type/spacing; stale-palette Auth
  exports are reconciled to the **current unified tokens** per the constitution's stale-screens rule.
  Persimmon stays on the primary action only.
- **Port, don't redesign (P-V)**: the auth screens are ported to current tokens; the authenticated
  surfaces are **not** redesigned — they change only where they read identity. The byte-stable seam swap
  is the core P-V guarantee of this slice.
- **Fixtures-first (P-VI)**: this tier is where the fixtures-first seam pays off — the stub session was
  always meant to be swapped for real auth behind the same helper. The new users/workspaces/memberships
  fixture shape is the schema contract; the seed reconciles existing fixtures under a real owner.
- **Consent (P-VII)**: **unchanged.** Consent records, versioning, revocation, and reads behave
  identically; consent reads are simply now workspace-scoped through the same seam. No consent
  re-modelling in this slice.
- **No editor (P-VIII)**: N/A — no clip/studio surface changes; the studio keeps its shipped format-picker
  form, now on the real session.
- **SDD scope (P-IX)**: one vertical slice — real auth + workspace/membership + the seam swap + fixture
  reconciliation. **No** speculative work: capture/sources (T7), render (T8), billing/settings/onboarding
  proper (T9+), and full team management are out of scope; deferred items surface as "coming" states, not
  built ahead.
- **Coding conventions (P-X)**: TS strict, Drizzle-only migrations, Server Components by default — applied
  to the new identity layer.
- **Reference Integrity (P-XI)**: N/A — no `/design-reference` or `/docs` edits in an implementation
  slice.
- **Port-Completeness (P-XIII)**: every auth control works or is an honest "coming" state — invites are
  the "Invite teammates — coming soon" affordance (deferred, FR-019). **No dead controls.**
- **Owned Data Only (P-XIV)**: the auth UI shows only real identity data — no fabricated user/workspace
  counts or activity.
- **Plan-Not-Code (P-XV)**: **N/A — non-render slice.**
- **No-LLM-in-Render (P-XVI)**: **N/A — non-render slice.**
- **Microcopy & Voice (P-XVII)**: auth copy is plain and editorial — no "amazing"/"awesome", no emoji;
  the "check your email", error, and any "coming" states are stated plainly.

## Design reconciliation (Authentication)

**Recorded 2026-06-25.** **Source (read, local):** `design-reference/Weavova/Authentication/` — 7 paired
HTML+PNG screens: **1** Sign in, **2** Sign up / account, **3** Sign up / workspace, **4** Verify email,
**5** Forgot password, **6** Reset password, **7** OAuth bridge. T6 increments 1–2 were built **without
porting from these local screens** — a **Principle V (Port-Don't-Redesign) gap**. This section records
the deliberate supersessions (so the divergence is a decision, not drift) and audits the built auth
against the real source, with a remediation list. **No rebuild in this pass** — record + audit only.

### Deliberate supersessions (Port-Don't-Redesign exception — Cornel, 2026-06-25)

- **Auth method → magic-link (passwordless).** Supersedes the password design: screen **1**'s password
  field, screen **2**'s password portion, screen **5** (Forgot password), and screen **6** (Reset
  password) are **designed-but-superseded**. **No password storage, no reset flow.** (Magic-link + Google
  was the locked T6 decision.)
- **Verify → magic-link "check your email" (`/verify`).** Screen **4**'s 6-digit **code** input is
  superseded by the magic-**link** page. Same intent (prove mailbox control), different mechanism:
  **retain the screen's frame, drop the code input** (and the 6-box / resend-timer affordance).
- **OAuth → Google only.** "Continue with **GitHub**" (screens **1**, **2**) is **dropped by decision**.
- **NOT superseded — port faithfully (scheduled).** The signup → **workspace-creation** flow (screens
  **2–3**: account step + "Name your workspace" / brand name / brand colour / Create workspace) is **real
  designed onboarding**, planned as the **workspace-creation slice (T6.1 fast-follow, CLAUDE.md §8)**, to
  be built **magic-link-native** (no password step).

### Audit — built vs source

**Screen 1 (Sign in) vs `src/app/login/page.tsx`:**

| Source element | In build? | Verdict |
|---|---|---|
| Split layout (form beside a proof panel) | **No** | **UNINTENDED** — P-V gap |
| "Verified real customer" persimmon mark | **No** | **UNINTENDED** — P-II/P-V gap |
| Maria L. proof card (quote + ML avatar + "Shopify · Soy candle · Fig & Cedar") | **No** | **UNINTENDED** — P-II/P-V gap |
| "The customer is the headline." line | Partial — present, but as a centered subtitle, not the left-panel footer | **UNINTENDED** (placement) — P-II |
| Weavova wordmark + persimmon stamp glyph | Partial — text wordmark yes; stamp glyph no | UNINTENDED (minor) |
| "Welcome back." heading | No (build says "Sign in") | UNINTENDED (minor copy) |
| Email field | Yes | match |
| Password field | No | **EXPECTED** (passwordless) |
| "Forgot password?" link | No | **EXPECTED** (superseded) |
| Persimmon primary button | Yes (as "Send magic link") | match (label per mechanism — expected) |
| "or" divider | Yes | match |
| Continue with Google | Yes | match |
| Continue with GitHub | No | **EXPECTED** (dropped) |
| "New here? Create an account" link | No | port gap → ties to the T6.1 signup/workspace slice |
| Pressroom tokens (Fraunces/Hanken/persimmon-scarce) | Yes | match |

**Screen 4 (Verify) vs `src/app/verify/page.tsx`:**

| Source element | In build? | Verdict |
|---|---|---|
| Split layout + proof panel | **No** | **UNINTENDED** — P-V/P-II gap |
| "Check your email." heading | Yes | match |
| "We sent … to {email}" subcopy | Yes (link, not code) | match intent; **EXPECTED** mechanism divergence |
| 6-digit code input boxes | No | **EXPECTED** (superseded by link) |
| Persimmon "Verify email" submit | No | **EXPECTED** (link is clicked in the email; nothing to submit) |
| "Didn't get it? Resend code · timer" | Partial — "request a new one" link, no timer | EXPECTED-ish (no code) — resend intent could still be ported |
| "The customer is the headline." line | **No** | **UNINTENDED** — P-II gap |
| Pressroom tokens | Yes | match |

### Retained-element checklist (should have been ported regardless of auth method)

- **Split layout (form beside proof panel)** — **MISSING** in both `/login` and `/verify`. **P-V gap**
  (screens 1, 4). This is the parent gap; the rest hang off it.
- **Maria L. "Verified real customer" proof card** — **MISSING** in both. **P-II/P-V gap** (screens 1, 4).
- **"The customer is the headline." line** — `/login`: present but **repositioned** (centered subtitle, not
  the left-panel footer); `/verify`: **missing**. **P-II gap** (both should carry it in the proof panel).
- **Pressroom tokens (Fraunces/Hanken/persimmon-scarce), light + dark** — **PRESENT** and correct
  (persimmon scarce — only on the primary action; tokens are theme-aware so dark derives). **PASS**, with
  the minor exception of the persimmon **stamp logo glyph** (not ported).

### Remediation list (port-fix pass — do NOT implement here; fold into Increment 3 or a dedicated pass)

1. **Port the split-layout shell** (proof-panel column beside the form column) into **both** `/login` and
   `/verify` — from `design-reference/Weavova/Authentication/1 _ Sign in` + `4 _ Verify email`. *(Parent
   fix — P-V; everything below hangs off it.)*
2. **Port the proof panel** into the left column of both: the **"Verified real customer"** persimmon mark
   + the **Maria L.** quote card (quote, ML avatar, "Shopify · Soy candle · Fig & Cedar") + the **"The
   customer is the headline."** footer line — screens 1 & 4. *(P-II on the auth surface.)*
3. **`/login` heading** — restore **"Welcome back."** (Fraunces) per screen 1 (or confirm "Sign in" as an
   intentional copy change). *(Minor — screen 1.)*
4. **Persimmon stamp logo glyph** beside the "Weavova" wordmark — screen 1 (shared auth chrome).
5. **`/verify`** — keep the magic-link supersession (no code boxes), but port the **frame** (split layout +
   heading + proof panel) and style the **"request a new link"** affordance after the screen's "Resend"
   row — screen 4.
6. **(Scheduled, not a now-fix)** Build the **signup → workspace-creation** flow (screens **2–3**)
   magic-link-native as the **T6.1 workspace-creation slice** — "New here? Create an account" → "Name your
   workspace" (workspace name, brand name, brand colour, Create workspace). Resolves the dropped
   "Create an account" link target.

## Assumptions

- **Verified email is the linking key** (FR-003): magic-link inherently verifies the address; Google
  supplies a verified-email signal. Linking happens only on a verified address.
- **The seeded demo identity** is a real user + a "Lumen Candle Co." workspace that owns the existing
  seeded proof (FR-007); the old stub string survives only as this **real** seed, not as a fallback.
- **Session strategy** (DB vs JWT session) is an implementation detail for `/speckit-plan`, constrained
  by the Drizzle adapter; it does not change the spec's behaviour.
- **A brand-new real sign-up with no workspace** is an edge case (the demo is seeded with one); the
  minimum honest behaviour is to provision a workspace or show an honest "setting up" state — full
  onboarding is a later tier.
- **Resend / Google creds** are provisioned in real environments; the build stays green without them
  (auth actions fail honestly in dev/CI).
- **Out of scope** (later tiers): capture + sources (T7), the render engine (T8), billing / settings /
  full onboarding / the public marketing site (T9+), password auth (passwordless only), and — per Q2 —
  team invites + multi-member management (fast-follow; the `owner|member` role column ships now per
  FR-018 so they are additive later).
