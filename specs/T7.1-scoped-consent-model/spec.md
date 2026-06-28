# Feature Specification: Scoped consent model (the ConsentDisplay payload + read path)

**Feature Branch**: `T7.1-scoped-consent-model`

**Created**: 2026-06-28

**Status**: Draft — **1 clarification OPEN** (see "Clarifications to resolve"). Do **not** `/speckit-plan`
until Q1 is answered by the human.

**Tier**: T7 — Capture. **T7.1 is the foundation slice**: it evolves the consent model itself, before
the capture form (T7.2) and verified bar that read it. **Schema + read-helper evolution, NOT new UI.**

**Input**: User description: "T7.1 — Scoped consent model. … evolve the consent model from simple
granted/revoked into the richer ConsentDisplay shape (use-scopes + display prefs) that the capture form
(T7.2) and the verified bar both depend on. This is a schema + read-helper evolution, NOT new UI
surfaces — the capture form that uses it is T7.2."

**Builds on**: T2.4a (the `consent` version model + `effectiveConsentState`), T2.4b (`getGrantedConsentId`
provenance gate), and **T5-Consent** (the consent ledger surface + the read-time-effective withdrawal
mechanism). This slice **enriches the payload** those mechanisms carry — it does **not** change the
mechanism.

---

## Overview

Since T2.4a, a proof's consent has been a binary the whole app reads at read time: `granted` /
`awaiting` / `revoked`, with the latest version winning (`effectiveConsentState`) and revocation
cascading for free because every surface re-reads at read time. That is enough to gate *whether* proof
can be used — but not *how* or *where*.

T7's capture form (T7.2) lets a real customer say more than yes/no: **which uses** they permit
(organic post, paid ad, public showcase, embeddable block) and **how they want to appear** (full name /
first-initial / anonymous; face shown or hidden). The verified bar then reflects those choices honestly.
Neither can be built until the **consent record carries that richer payload** and the **shared read
helpers thread it through to every consumer**. **T7.1 is that foundation.**

**What this slice delivers (model + read path only — no new UI surface):**

- **The `ConsentDisplay` payload on each consent version** —
  - **`useScope[]`** — the permitted uses, drawn from a closed set: `organic` · `paid` · `showcase` ·
    `embed`. A consent **defaults to least-privilege (`organic` only)**; `paid` / `showcase` / `embed`
    are **explicit opt-ins, never pre-granted**.
  - **`nameDisplay`** — how the customer is named: `full` · `first_initial` · `anonymous`.
  - **`showFace`** — whether the customer's face may be shown (boolean).
- **The workspace display-default** — the workspace's default `nameDisplay` / `showFace`, used when a
  customer does not override. **(Storage location is the one OPEN clarification — see Q1.)**
- **A read path that carries scope + display through to every consumer** — `effectiveConsentState` /
  `getGrantedConsentId` (and the sibling `latestConsent*` helpers) are **extended** so the richer
  payload reaches the existing consent consumers, **with the existing read-time-effective behaviour
  intact**. The model also exposes a **clean scope check** (e.g. "is `paid` permitted for this proof?")
  that T9 distribution can later gate channels on — **T7.1 builds the model + the read path; the
  enforcement surfaces come later**.
- **An additive migration** adding the payload to the consent-version schema.
- **Backfill** of the existing fixtures.

**The two invariants that make this "Consent Is Sacred" and not just more fields:**

1. **Least-privilege default.** A new consent grants `organic` only. The richer model must **never
   assume a permission the customer did not deliberately give** — `paid` / `showcase` / `embed` are
   opt-ins.
2. **Privacy override is one-directional.** The workspace sets a default `nameDisplay` / `showFace`; the
   customer may override **only toward more privacy** (more anonymous, or hide face), **never less**.
   A customer can always be more private than the workspace default; they can never be forced to be less
   private than they chose.

**What stays exactly the same (P-VII mechanism UNCHANGED).** Withdrawal is still a **new `revoked`
version**, read-time-effective, retained for audit ("pull, don't destroy"). Only the **payload** each
version carries is richer. The seeded **Leo M.** withdrawal must behave **identically** — its `granted`
→ `revoked` timeline still resolves to withdrawn, and its clips are still withheld read-time.

**Backfill is honest, not invented (P-XIV).** Existing fixtures predate the richer payload; they were
created when "granted" meant "usable everywhere". To keep the demo coherent **and** match that prior
behaviour, existing **granted** consent versions backfill to **full scope** (`organic` + `paid` +
`showcase` + `embed`) with display preferences matching today's presentation. This is the **honest
equivalent of the behaviour those fixtures already had** — not a fabricated grant beyond what the
fixture implied. (The least-privilege default applies to **new** consents captured via T7.2, not to
this backfill of already-full-trust demo data.)

**Byte-stable except where a consumer newly reads scope/display (P-V).** This is a model/read-helper
evolution behind the **same seam** every consent consumer already routes through. The existing
consumers — the inbox / `ProofCard`, Library, dashboard, export, warmth, showcase, clip-detail, proof
detail, the **T5 consent ledger**, and the generate gates (`generateClip` / `generateBatch`) — keep
working through the **extended** helpers and stay **byte-stable**, **except** where a consumer is
explicitly updated to read the new scope/display payload. T7.1 introduces **no new visible behaviour**
in those surfaces beyond carrying the richer data through; it is the foundation the T7.2 form and the
verified bar consume.

---

## User Scenarios & Testing *(mandatory)*

> **Note on actors.** This slice has **no new UI surface**; its "users" are (a) the **downstream
> features** (T7.2 capture form, verified bar, T9 distribution) that read the model, and (b) the
> **maintainer/demo** verifying the model behaves correctly on fixtures. Scenarios are written as
> independently testable behaviours of the model + read path.

### User Story 1 - The consent record carries use-scope and display preferences (Priority: P1)

Every consent version now records **which uses** the customer permitted and **how they want to appear**,
and the shared read helpers carry that payload to any consumer that asks for it — without changing the
read-time-effective behaviour that already drives the app.

**Why this priority**: This is the foundation. Without the payload on the record and on the read path,
neither the T7.2 capture form nor the verified bar can be built. It is the MVP of the slice.

**Independent Test**: Read a granted proof's effective consent through the extended helper and confirm
it returns the `useScope[]`, `nameDisplay`, and `showFace` for the effective version, alongside the
existing state/version/date — with the existing state resolution unchanged.

**Acceptance Scenarios**:

1. **Given** a granted proof, **When** its effective consent is read, **Then** the result includes the
   effective version's `useScope[]` (a subset of `organic` / `paid` / `showcase` / `embed`),
   `nameDisplay` (`full` / `first_initial` / `anonymous`), and `showFace` (boolean), **in addition to**
   the existing state / version / effective-date.
2. **Given** a proof with multiple consent versions, **When** the effective consent is read, **Then**
   the **latest version's** payload is returned (same latest-version-wins resolution as today) — earlier
   versions' payloads are retained but not effective.
3. **Given** any consumer that does not need scope/display, **When** it reads consent through the shared
   helper, **Then** its result is **byte-identical** to today (the extension is additive; nothing a
   consumer didn't ask for changes).

---

### User Story 2 - Least-privilege default and one-directional privacy override hold (Priority: P1)

A newly captured consent grants only `organic` until the customer explicitly opts into more, and the
customer's display choice can only ever be **more** private than the workspace default — never less.

**Why this priority**: These two invariants are *the point* of the slice — "Consent Is Sacred" encoded
in the model, not a UI nicety. The model must enforce them so that no later surface can accidentally
over-grant.

**Independent Test**: Construct a new consent with no explicit scope and confirm it is `organic` only;
attempt to construct a consent whose display preference is **less** private than the workspace default
and confirm the model rejects/clamps it to no-less-private; confirm a **more** private override is
accepted.

**Acceptance Scenarios**:

1. **Given** a new consent created with no explicit `useScope`, **When** it is stored, **Then** its
   scope is **`organic` only** — `paid` / `showcase` / `embed` are absent unless explicitly opted in.
2. **Given** a workspace default of (e.g.) `nameDisplay: full`, `showFace: true`, **When** a customer
   override requests **more** privacy (`first_initial`/`anonymous`, or `showFace: false`), **Then** the
   override is accepted and recorded on the version.
3. **Given** the same workspace default, **When** a customer override would be **less** private than the
   default (e.g. `full` when default is `anonymous`, or `showFace: true` when default is `false`),
   **Then** the model does **not** allow the customer to be recorded as less private than they chose —
   the effective display can never move below the customer's own choice toward the default.
4. **Given** no customer override at all, **When** the effective display is resolved, **Then** it falls
   back to the **workspace default** (the customer accepted it).

---

### User Story 3 - Use-scope is an enforceable gate, not just a stored preference (Priority: P2)

The model exposes a clean way to ask "is use X permitted for this proof's effective consent?" so that
T9 distribution can later refuse to use, e.g., an `organic`-only clip in a `paid` campaign.

**Why this priority**: The enforcement *surfaces* are T9, but the **model must support a clean scope
check now** or T9 cannot gate cleanly. It is the forward-contract of the slice; the payload (US1) and
invariants (US2) deliver value first, so this is P2.

**Independent Test**: For a proof whose effective consent is `organic` only, query whether `paid` is
permitted and confirm `false`; for a full-scope proof, confirm `paid` is `true`; for a withdrawn proof,
confirm **every** scope check is `false` (withdrawn permits nothing).

**Acceptance Scenarios**:

1. **Given** a proof whose effective consent permits `organic` only, **When** asked whether `paid`
   (or `showcase`/`embed`) is permitted, **Then** the answer is **`false`**; `organic` is `true`.
2. **Given** a full-scope granted proof, **When** asked about any scope, **Then** the answer is **`true`**
   for each permitted scope.
3. **Given** a proof whose effective consent is **withdrawn** (`revoked`) or **awaiting**, **When** any
   scope is checked, **Then** the answer is **`false`** — a non-granted consent permits **no** use
   (fails closed, consistent with today's gate).

---

### User Story 4 - The Leo M. withdrawal still behaves identically, and the demo stays coherent (Priority: P1)

The richer payload does not disturb the established withdrawal mechanism or the existing consumers: the
seeded Leo M. proof still resolves to withdrawn read-time, its clips are still withheld, and every other
fixture reads coherently under full-scope backfill.

**Why this priority**: This is the regression guarantee. The slice is worthless if it silently changes
how P-VII withdrawal or any existing surface behaves.

**Independent Test**: Re-seed; confirm Leo M. resolves to withdrawn and his clips are withheld from
Library / showcase / export exactly as before; confirm the inbox / dashboard / warmth / clip-detail /
T5 ledger render unchanged for all fixtures; confirm a green build.

**Acceptance Scenarios**:

1. **Given** the seeded Leo M. proof (`granted` v1 → `revoked` v2), **When** its effective consent is
   read under the richer payload, **Then** it resolves to **withdrawn** and his clips are **withheld**
   read-time — **identical** to pre-T7.1 behaviour.
2. **Given** all existing fixtures, **When** they are backfilled, **Then** each **granted** version
   carries **full scope** and display preferences matching today's presentation — and the inbox,
   Library, dashboard, export, warmth, showcase, clip-detail, proof detail, and T5 consent ledger render
   **byte-stable** (no visible change from the payload extension alone).
3. **Given** the whole slice, **When** the project is built and linted, **Then** it builds green with no
   change to the locked stack or the Pressroom tokens.

---

### Edge Cases

- **Awaiting consent (never granted)**: carries no meaningful scope; every scope check returns `false`.
  Backfill leaves awaiting versions without granted scope (nothing to grant).
- **Withdrawn consent**: the withdrawn (`revoked`) version is effective; **every** scope check returns
  `false` regardless of any scope recorded on prior granted versions (a withdrawal withholds *all* use).
- **Proof with no consent row at all**: resolves to non-granted (fails closed) — unchanged from today;
  scope checks return `false`.
- **Empty `useScope`**: an effective granted consent with an empty scope set permits **nothing** —
  treated the same as least-privilege-not-yet-chosen; it never silently means "all".
- **Override exactly equal to the workspace default**: accepted as-is (it is not "less private").
- **Workspace with no display-default configured**: the model falls back to a **defined, least-surprising
  built-in default** (documented in Assumptions) so resolution never errors; a workspace default is a
  preference, not a hard requirement.
- **Unknown/legacy scope value** encountered on read: ignored (not treated as a granted scope) so a
  forward/stale value can never widen permission.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each consent version MUST be able to carry a **`ConsentDisplay` payload**: a `useScope[]`
  (any subset of the closed set `organic` / `paid` / `showcase` / `embed`), a `nameDisplay`
  (`full` / `first_initial` / `anonymous`), and a `showFace` boolean.
- **FR-002**: The change MUST be an **additive migration** to the consent-version schema — it MUST NOT
  alter the existing `state` / `version` / date columns or the append-only versioning, and MUST NOT
  change the P-VII withdrawal mechanism (withdrawal stays a new `revoked` version, read-time-effective,
  retained for audit).
- **FR-003**: A **newly created consent MUST default to least-privilege** — `organic` scope only.
  `paid`, `showcase`, and `embed` MUST be **explicit opt-ins** and MUST NEVER be pre-granted by default.
- **FR-004**: The workspace MUST have a **default `nameDisplay` / `showFace`** that applies when a
  customer does not override. *(Where this default is stored is Q1 — OPEN.)*
- **FR-005**: A customer's display override MUST be allowed to move **only toward more privacy** (more
  anonymous name, or hiding the face) relative to the workspace default. The model MUST NOT record or
  resolve a customer as **less** private than the customer's own choice — the override can never be
  weakened toward the workspace default.
- **FR-006**: The shared read helpers (`effectiveConsentState` and its `latestConsent*` siblings, and
  `getGrantedConsentId`) MUST be **extended to carry the scope + display payload of the effective
  version through to consumers**, while **preserving the existing read-time-effective state resolution**
  (latest version wins; non-granted fails closed) **byte-for-byte**.
- **FR-007**: The model MUST expose a **clean scope check** — given a proof, answer whether a given use
  (`organic` / `paid` / `showcase` / `embed`) is permitted by its **effective** consent — such that T9
  distribution can later gate channels on it. A **non-granted** (withdrawn / awaiting / missing)
  effective consent MUST return **`false` for every scope** (fails closed).
- **FR-008**: Existing fixtures MUST be **backfilled**: each existing **granted** consent version gets
  **full scope** (`organic` + `paid` + `showcase` + `embed`) and display preferences matching today's
  presentation — the honest equivalent of the behaviour those fixtures already had (P-XIV). Non-granted
  (awaiting/revoked) versions are not granted scope by the backfill.
- **FR-009**: The seeded **Leo M.** withdrawal MUST behave **identically** under the richer payload —
  resolve to withdrawn read-time, withhold its clips — and **every** scope check on it MUST return
  `false`.
- **FR-010**: The slice MUST keep the existing consent consumers working through the extended helpers and
  **byte-stable except where a consumer is explicitly updated to read scope/display**: the inbox /
  `ProofCard`, Library, dashboard, export, warmth, showcase, clip-detail, proof detail, the **T5 consent
  ledger**, and the generate gates (`generateClip` / `generateBatch`). T7.1 MUST NOT introduce new
  visible behaviour in those surfaces beyond carrying the richer payload.
- **FR-011**: The model MUST show/return **only real owned consent data** (FR-019 / P-XIV) — backfilled
  scopes are honest defaults matching prior behaviour, never invented grants beyond what the fixture
  implied. No fabricated scope, display preference, or count.
- **FR-012**: An **empty `useScope`** on an effective granted version MUST permit **nothing** (it MUST
  NEVER be interpreted as "all"); an **unknown/legacy scope value** on read MUST be ignored, never
  treated as a granted permission.

### Key Entities *(include if feature involves data)*

- **Consent version (existing, enriched)**: a proof's consent at a point in time — its `state`
  (granted / awaiting / revoked), `version`, effective date, **and now its `ConsentDisplay` payload**
  (`useScope[]`, `nameDisplay`, `showFace`). Append-only; latest version is effective; prior versions
  retained for audit.
- **ConsentDisplay (new payload)**: the use-scopes + display preferences recorded on a consent version.
  `useScope[]` is the enforceable permission set; `nameDisplay` + `showFace` are the presentation
  preferences.
- **UseScope (closed set)**: `organic` · `paid` · `showcase` · `embed`. The enforceable gate downstream
  distribution (T9) checks.
- **Workspace display-default (new)**: the workspace-level default `nameDisplay` / `showFace` applied
  when a customer does not override. **Storage location is Q1 (OPEN).**
- **Effective consent (read projection, enriched)**: what the shared helpers return — the effective
  version's state + version + date **and** its resolved scope + display, with the resolution honoring
  the one-directional privacy invariant and least-privilege.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Reading any granted proof's effective consent returns its `useScope[]`, `nameDisplay`, and
  `showFace` alongside the existing state/version/date — verifiable on **100%** of granted fixtures.
- **SC-002**: A newly created consent with no explicit scope is `organic`-only in **100%** of cases —
  **0** instances of `paid`/`showcase`/`embed` ever pre-granted by default.
- **SC-003**: For **0** cases can a customer override resolve the customer as **less** private than their
  own choice; a **more**-private override is honored in **100%** of cases.
- **SC-004**: The scope check returns the correct permit/deny for every (proof, scope) pair on fixtures,
  and returns **`false` for every scope** on **100%** of non-granted (withdrawn/awaiting/missing) proofs.
- **SC-005**: After backfill, **100%** of existing granted versions carry full scope; the Leo M.
  withdrawal still resolves withdrawn and withholds its clips — **0** behavioural change in the existing
  consumers, **0** changes to those surfaces' code beyond carrying the payload through.
- **SC-006**: Every value carried by the model is real owned consent data — **0** fabricated scopes,
  display preferences, or counts. The project builds and lints green.

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: this slice deepens *how the customer's own wishes are honored* —
  use-scopes and display preferences are the customer's voice carried faithfully through the model. No
  surface here, but the payload exists to let later surfaces present the customer exactly as they chose.
- **Port, don't redesign (P-V)**: **N/A for layout** — no UI surface in this slice. The relevant P-V
  discipline is the **seam**: this is a model/read-helper evolution behind the same `effectiveConsentState`
  / `getGrantedConsentId` seam every consumer already routes through; consumers stay byte-stable except
  where explicitly updated to read scope/display.
- **Fixtures-first (P-VI)**: built and demonstrated on the existing fixtures; the **fixture shape is the
  schema contract** — the backfilled `ConsentDisplay` shape is exactly what real captured consent
  (T7.2) will write. No real back end required for this slice.
- **Consent (P-VII)**: the **mechanism is unchanged** — withdrawal is still a new `revoked` version,
  read-time-effective, retained for audit; revocation still cascades for free. Only the **payload** is
  richer. The two new invariants (least-privilege default, one-directional privacy override) are P-VII
  deepened — "Consent Is Sacred" encoded in the model.
- **No editor (P-VIII)**: N/A — no studio/format surface in scope.
- **Scope (P-IX, P-XI)**: one vertical slice — the model + the read path + the backfill. **No new UI**
  (the capture form is T7.2; the verified bar consumes this later; enforcement surfaces are T9). No
  speculative additions beyond the clean scope check the forward-contract requires.
- **Microcopy (P-XVII)**: N/A — no product copy in this slice (no UI). Any later surface inherits the
  copy rules.
- **Port-completeness / no dead controls (P-XIII)**: **N/A** — no UI controls in this slice. If Q1's
  resolution implied a not-yet-built scope-default control, that control is **out of scope here** and
  would be an honest coming-state when built (T9 settings or T7.2), never a dead control now.
- **Owned data only (P-XIV)**: backfilled scopes are honest defaults matching the behaviour the fixtures
  already had — **not** fabricated grants beyond what the fixture implied. No invented capability/metric.
- **Plan-not-code (P-XV)**: **N/A — non-render slice.**
- **No-LLM-in-render (P-XVI)**: **N/A — non-render slice.**

## Clarifications to resolve *(blocking — human decision, the B-pattern)*

Surfaced, not assumed. One open question; lean noted.

### Question 1: Where does the workspace-level `nameDisplay` / `showFace` default live?

**Context**: Display preferences are **workspace default + customer override**. The workspace needs a
home for its default `nameDisplay` / `showFace`. The lightest option that does **not** presuppose a T9
settings surface is preferred. (Note: `brand_kit` is a **multi-row** table with **no unique constraint
on `workspaceId`** — it is not a natural home for a per-workspace singleton default. `workspace` is the
natural singleton row.)

| Option | Answer | Implications |
|--------|--------|--------------|
| A | **Additive field(s) on the existing `workspace` row** | Lightest. The `workspace` row is the natural per-workspace singleton; two nullable columns (or one small jsonb) hold the default. No new table, no presupposed settings UI; reads are a join the helpers already do. **(Recommended.)** |
| B | **A small dedicated consent-defaults field/table** | Cleaner separation of "consent config" from core workspace, room to grow (per-source defaults, retention) — but a new table/row to seed and join, heavier than the slice needs, and edges toward a T9 settings shape this slice should not presuppose. |
| C | **On `brand_kit`** (as the literal option text offered) | Rejected unless re-scoped: `brand_kit` is multi-row with no `workspaceId` uniqueness, so a "workspace default" there is ambiguous (which kit?). Would need a uniqueness/seed change out of scope here. |
| Custom | Your own | — |

**Recommendation**: **A** — additive field(s) on the `workspace` row: lightest, singleton-correct, and
presupposes no T9 settings surface. **Your choice**: ____

## Assumptions

- **Actor / no UI**: this slice ships **no new UI surface**. Its consumers are downstream features
  (T7.2 capture form, verified bar, T9 distribution) and the demo/maintainer verifying the model.
- **`ConsentDisplay` storage shape is `/plan`'s call**: the consent table already has a nullable
  `captureContext` jsonb; whether the richer payload lands as explicit typed columns, an extension of
  that jsonb, or a mix is an implementation decision for `/speckit-plan`. The spec fixes the **shape and
  invariants**, not the column layout.
- **Closed scope set**: `useScope` is the fixed set `organic` / `paid` / `showcase` / `embed` for this
  slice; new scopes are an additive future change.
- **Least-privilege applies to NEW consents, not the backfill**: the backfill restores the **full-trust
  behaviour the existing demo fixtures already had** (granted == usable everywhere); the
  `organic`-only default governs **future captured consent** (T7.2). These are not in conflict — backfill
  is honest-prior-behaviour, default is the new least-privilege rule.
- **Built-in fallback default**: when a workspace has no configured display default, the model falls back
  to a defined least-surprising built-in (assumed: `nameDisplay: first_initial`, `showFace: true` — the
  current fixtures present first-initial names with faces shown). `/plan` may refine; resolution must
  never error on a missing workspace default.
- **No new dependency, no new gate, no new consent mechanism** — the P-VII mechanism, the read-time
  cascade, and the existing seam are all reused; only the payload they carry is richer.
- **Verification basis** (the broader T7 verification-basis work) is **not** part of T7.1; this slice is
  scope + display only.
