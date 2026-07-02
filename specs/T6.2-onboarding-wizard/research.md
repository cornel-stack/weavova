# Phase 0 — Research: T6.2 Onboarding Wizard

Grounded in the T6.1/T7.x code and the 5 synced design files. The five settled product decisions are
carried, not re-opened. New decisions surfaced below with recommendations.

## Settled (carried)

| # | Decision |
|---|---|
| S1 | Full 4-step wizard + tour, ported faithfully; honest where deferred. |
| S2 | `business_type` + `first_format` = new nullable additive columns (code-side allowlist). |
| S3 | "Skip for now" sets `onboarded_at` (global skip, no nag). |
| S4 | Tour = non-blocking one-shot; `onboarded_at` set at Finish/skip. |
| S5 | Step 2 native connectors reuse the T7.3 "coming soon" pattern; Step 3 reuses brand actions; Step 2 webhook reuses `getOrCreateWebhookEndpoint`; logo → public bucket. |

---

## D1 — Where the routing gate lives

**Decision:** In the **Layer-2 layouts** (`src/app/app/layout.tsx` forward gate, new
`src/app/onboard/layout.tsx` inverse gate), **not** in middleware. Middleware only gets its matcher
extended to cover `/onboard/:path*`.

**Rationale:** `src/middleware.ts` is deliberately a cookie-**presence** check with no DB read
(edge-safe, build-green without `DATABASE_URL`). The `onboarded_at` decision requires a DB read, and
both layouts already resolve `getCurrentWorkspace()` (which returns `onboarded_at` since T6.1). So the
gate is a **free** conditional on data already in hand — consistent with the documented model
"middleware protects routes, loaders/layouts protect reads." Seeded owner + existing sessions are
undisturbed (their `onboarded_at` is set → forward gate no-ops).

**Alternatives considered:** a DB read in middleware (rejected — breaks the edge-safe, DB-free
middleware invariant and the build-green-without-DATABASE_URL property); a per-page server check
(rejected — repetitive and easy to miss a route; the layout is the single chokepoint).

---

## D2 — Step-2 webhook reuse vs the Sources track

**Decision:** Reuse `getOrCreateWebhookEndpoint(workspaceId)` (T7.4) to surface the real URL + secret;
render native connectors as honest "coming" via the T7.3 pattern; build **no** OAuth.

**Rationale:** The generic webhook is already built and provisioned — surfacing it is real plumbing
(P-XIII), not a placeholder. The native connectors are the deferred Sources track; the T7.3
`request-builder` "coming soon" affordance is the established, consistent honesty pattern. The Sources
track later attaches OAuth **behind the same cards**, so this slice leaves a clean seam and no rework.

**Alternatives considered:** a new webhook surface for onboarding (rejected — duplicates T7.4); dead
native buttons (rejected — P-XIII); hiding native connectors entirely (rejected — the design shows
them, and honest "coming" is the intended state).

---

## D3 — Step 4 preview: decorative vs personalized render

**Decision:** The format tiles are **decorative concept-art**, ported as **static illustration**. No
personalized preview, no "coming at render" caption.

**Rationale (inspection of design 4):** the file `4 _ First format  _onboard_format.html` contains
**zero** occurrences of "preview / render / sample / your proof / your clip / example". Unlike design
3 ("Live preview"), design 4 has no preview panel — the cards are illustrative option tiles. So there
is nothing implying a render of the user's proof; porting the tiles statically is faithful and honest
(P-XIV — nothing fabricated). This closes the spec's flagged Step-4 question.

---

## D4 — Tour trigger mechanism (non-blocking one-shot)

**Decision:** **Finish** redirects to `/app?tour=1`; the dashboard reads the param once, launches the
5-step spotlight overlay, then removes the param (client-side). **Skip** redirects to `/app` (no
tour). No schema, no persisted "tour seen" flag.

**Rationale:** `onboarded_at` is already set at Finish, so the tour must not gate or persist state — a
query-param one-shot is the minimal honest trigger. A refresh without the param shows no tour (matches
"one-shot"); abandoning the tour leaves the user onboarded (S4). Skip intentionally bypasses the tour.

**Alternatives considered:** a `tour_seen` column (rejected — unnecessary schema for a one-shot); auto
-showing the tour on every first dashboard visit until dismissed (rejected — needs persistence and
risks nagging).

---

## D5 — Resume behavior for a mid-wizard return

**Decision:** The forward gate redirects to `/onboard/role` (step 1); each step **pre-fills** from the
persisted value (`business_type`, brand kit, `first_format`). Resume-at-furthest-incomplete is
deferred.

**Rationale:** Only steps 1 and 4 have a definitive "written" column; steps 2 (webhook is optional to
act on) and 3 (brand optional) have no required write, so "furthest incomplete" is ambiguous. Starting
at step 1 with pre-filled values loses nothing (edge case: "steps saved so far persist") and keeps the
gate trivial. A smarter resume can be added later without rework.

---

## D6 — Column type: text+allowlist vs enum

**Decision:** `business_type` and `first_format` are **nullable `text`** with a **code-side
allowlist**, matching the `source.kind` precedent (open, growing set validated in code).

**Rationale:** Text+allowlist is the established pattern for merchant-category-like sets in this
codebase and avoids an enum migration when the set grows. A `pgEnum` is the alternative (stricter DB
constraint) but is heavier to evolve. Both are additive; text+allowlist is recommended.

---

## No open [NEEDS CLARIFICATION]

All decisions have determinate, code-grounded answers. If implementation reveals a needed change to a
frozen core (brand-kit/webhook models, `onboarded_at`, consent/verification), **stop and surface**
rather than proceed (P-V).
