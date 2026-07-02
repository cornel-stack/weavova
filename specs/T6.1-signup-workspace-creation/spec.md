# Feature Specification: T6.1 — Signup → Workspace Creation

**Feature Branch**: `T6.1-signup-workspace-creation`

**Created**: 2026-07-02

**Status**: Draft

**Input**: User description: "T6.1 — Signup → workspace creation (the deferred T6 gap). A first-time sign-in should bootstrap a real workspace + owner membership so a genuinely new user can use the product. The onboarding WIZARD is a separate later slice — NOT in scope."

---

## Context (ground truth at spec time)

A bootstrap step **already exists** in the T6 auth layer: an Auth.js `events.createUser` hook
that, on new-user creation, checks for an existing membership and — if none — inserts a workspace
and an owner membership. This slice is therefore a **hardening / correctness** slice, not a
greenfield one. The existing hook has concrete gaps this slice closes:

1. **Not atomic.** It performs two separate inserts (workspace, then membership). A failure between
   them leaves an orphan workspace with no membership — the exact partial-create the app must never
   produce. A batch/atomic primitive is already used elsewhere in the codebase for multi-row writes.
2. **Trigger is too narrow.** It fires only when the auth adapter *creates a user row*. A user who
   exists but has zero memberships (a prior partial create, a row that predates the hook, or any
   future divergence) is never repaired and hits the "authenticated but no workspace" dead-end when
   the app resolves their workspace.
3. **Naming is raw.** The workspace name is the user's raw display name (or a generic fallback),
   not a human-sensible default derived from the user.
4. **No seam for the future onboarding wizard.** There is no honest signal that a workspace is
   freshly created and not yet configured.

Every surface a new user first sees — dashboard, proof inbox, requests, and the other rail
destinations (library, showcase, consent, brand) — **already renders an honest empty state or an
honest default** when the workspace has no content. This slice must **verify** those states hold for
a genuinely empty (never-seeded) workspace and fix any that assume seeded data — not build a new
empty-state design system.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A brand-new person signs in and lands in a usable, empty workspace (Priority: P1)

A person who has never used Weavova signs in for the first time (via magic-link **or** Google).
The system creates a workspace they own and places them inside it. Every core surface renders an
honest, working empty state that points them toward collecting their first proof — nothing is
broken, and nothing looks like another business's seeded data.

**Why this priority**: Without this, a genuinely new user is authenticated but has no workspace, and
every workspace-scoped screen dead-ends. This is the whole point of the slice — it is the difference
between "can sign in" and "can use the product."

**Independent Test**: Sign in with an email/identity that has no existing membership; confirm a
workspace + owner membership is created, the app resolves that workspace, and the dashboard, inbox,
and requests surfaces render their honest empty states (not errors, not seeded-looking content).

**Acceptance Scenarios**:

1. **Given** an identity with no user row and no membership, **When** they complete a first sign-in
   via magic-link, **Then** exactly one workspace and one owner membership are created for them and
   they are placed in that workspace.
2. **Given** an identity with no user row and no membership, **When** they complete a first sign-in
   via Google, **Then** the same single-workspace + owner-membership outcome occurs (provider-agnostic).
3. **Given** a freshly bootstrapped workspace with no proof, requests, or clips, **When** the user
   opens the dashboard, proof inbox, and requests surfaces, **Then** each renders its honest empty
   state with a clear pointer toward collecting the first proof, and none displays fabricated or
   seeded-looking data.
4. **Given** a freshly bootstrapped workspace, **When** the user navigates to any other rail
   destination (library, showcase, consent, brand), **Then** each renders an honest empty state or
   honest defaults and does not error.

---

### User Story 2 - An existing user (seeded owner or returning user) is undisturbed (Priority: P1)

A user who already belongs to a workspace signs in again — including the seeded demo owner and a
user linking a second sign-in provider to an existing account. No new workspace is created; they
land in their existing workspace exactly as before.

**Why this priority**: The bootstrap must be surgically additive. If it fires for users who already
have a workspace, it corrupts the seed and creates duplicate/ghost workspaces — a data-integrity
failure. Preserving the existing path is as important as adding the new one.

**Independent Test**: Sign in as the seeded owner and as a user who already has a membership; confirm
no workspace is created and they resolve to their existing workspace, byte-stable with today's behavior.

**Acceptance Scenarios**:

1. **Given** the seeded demo owner (verified email already mapped to the seeded workspace), **When**
   they sign in, **Then** no bootstrap occurs and they land in the seeded workspace unchanged.
2. **Given** a user who already has an owner membership, **When** they sign in again, **Then** no
   additional workspace or membership is created.
3. **Given** a user who already has a workspace and signs in with a **second, different** provider
   for the same verified email (account linking), **Then** the two identities resolve to the one
   existing account and **no second workspace is created**.

---

### User Story 3 - A future onboarding wizard can tell a workspace is not yet configured (Priority: P3)

The workspace created by the bootstrap is in a "freshly created, not yet onboarded" state. A later
slice (the onboarding wizard: business-type / source / brand / format) can detect this state and
offer to configure the workspace, without this slice building any of that configuration.

**Why this priority**: This is a cheap forward-seam, not user-facing behavior in this slice. It
matters only so the next slice is additive rather than a migration/rework. It is the lowest priority
because the product is fully usable without it.

**Independent Test**: Inspect a freshly bootstrapped workspace and confirm it carries an honest,
queryable "not yet onboarded" signal distinguishable from a workspace that has completed onboarding;
confirm the seeded workspace is treated as already-onboarded (or otherwise not falsely flagged as new).

**Acceptance Scenarios**:

1. **Given** a workspace created by the bootstrap, **When** its onboarding state is queried, **Then**
   it reports "not yet onboarded."
2. **Given** the seeded demo workspace, **When** its onboarding state is queried, **Then** it is not
   falsely presented to the user as a brand-new/unconfigured workspace.

---

### Edge Cases

- **Magic-link user with no display name.** A magic-link sign-in yields an email but no name. The
  default workspace name MUST still be sensible (derived from the email), never blank or a bare
  fallback that reads like a placeholder.
- **Partial create from a prior run.** A user row exists with zero memberships (e.g., a workspace
  insert succeeded but the membership insert failed previously). On their next sign-in the bootstrap
  MUST repair this — create the missing membership (and workspace if absent) — rather than leaving
  them stranded. This is why the trigger must be sign-in-time, not only user-creation-time.
- **Concurrent/duplicate first sign-in.** Two near-simultaneous first sign-ins (or a retried
  request) for the same new user MUST NOT produce two workspaces or two owner memberships; the
  outcome is exactly one of each (idempotent).
- **Account linking to an existing workspace-owning account.** Linking a second provider MUST NOT be
  read as "no membership → bootstrap"; the membership check must reflect the linked (single) account.
- **Bootstrap failure.** If the workspace/membership creation cannot complete, the user MUST NOT be
  left in a half-created state that the app then treats as a usable workspace; a failed bootstrap
  surfaces as an honest error and is retried on the next sign-in (never a silent orphan).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On a successful sign-in, the system MUST determine whether the signed-in user has any
  workspace membership, and if they have none, bootstrap one — regardless of which provider
  (magic-link or Google) was used.
- **FR-002**: The bootstrap MUST create exactly one workspace and exactly one **owner** membership
  linking that user to that workspace, and place the user in that workspace.
- **FR-003**: The workspace and its owner membership MUST be created **atomically** — the system MUST
  NOT be able to persist a workspace with no membership, or a membership with no workspace. (The
  environment has no interactive transactions; the existing batch/multi-write pattern is the vehicle.)
- **FR-004**: The bootstrap MUST be **idempotent**: a user who already has a membership gets no new
  workspace, and a repeated/concurrent first sign-in for the same user yields exactly one workspace
  and one owner membership.
- **FR-005**: The bootstrap MUST fire for users with **zero** memberships and MUST NOT fire for users
  with **one or more** memberships — the check is on membership existence, not on whether the user
  row is new.
- **FR-006**: Account linking (a second verified-email provider linking to an existing account) MUST
  NOT trigger a second bootstrap; the "no membership" check MUST evaluate against the single resolved
  account, not per provider.
- **FR-007**: The bootstrapped workspace MUST be given a sensible default name derived from the user
  (their name when present, otherwise derived from their email), suitable for display and later
  rename by the onboarding wizard. No blocking name prompt is shown in this slice.
- **FR-008**: The seeded demo path MUST be untouched — the seeded owner still resolves to the seeded
  workspace, and re-seeding behavior is unchanged.
- **FR-009**: After bootstrap, the workspace-resolution used across the app MUST resolve the new
  user's workspace exactly as it does for existing users, with unchanged return shape (byte-stable
  for all existing callers). The "authenticated but no workspace" dead-end MUST be genuinely
  unreachable for a user who has just signed in.
- **FR-010**: The dashboard, proof inbox, and requests surfaces MUST render honest, working empty
  states for a genuinely empty (never-seeded) workspace — no error, no broken layout, no
  seeded-looking or fabricated content — and MUST point the user toward collecting their first proof.
- **FR-011**: Every other rail destination a new user can reach (library, showcase, consent, brand)
  MUST render an honest empty state or honest defaults for an empty workspace and MUST NOT error.
- **FR-012**: The bootstrapped workspace MUST carry an honest, queryable signal that it is freshly
  created and **not yet onboarded**, distinct from a configured workspace, so the future onboarding
  wizard can detect it — without this slice building any wizard configuration. The seeded workspace
  MUST NOT be falsely presented to the user as a brand-new/unconfigured workspace.
- **FR-013**: A failed bootstrap MUST NOT leave a usable-looking half-created workspace; it MUST
  surface as an honest error and be re-attempted on the next sign-in.
- **FR-014**: This slice MUST NOT build the onboarding wizard (business-type / source / brand /
  format) and MUST NOT introduce a new authentication provider or a new dependency.

### Key Entities *(include if feature involves data)*

- **User**: An authenticated identity (one per verified email; a single account may link multiple
  sign-in providers). Carries at least a display name (optional) and email.
- **Workspace**: The tenant that owns all proof and derived content. A newly bootstrapped workspace
  has a derived default name and a "not yet onboarded" state, and no content.
- **Membership**: The link between a user and a workspace, carrying a role (`owner` for the
  bootstrapping user). Unique per (user, workspace). Its existence is the signal that decides whether
  the bootstrap fires.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person with no prior Weavova account can go from a first sign-in to a usable,
  workspace-scoped app with zero manual setup steps (no name prompt, no configuration) in this slice.
- **SC-002**: 100% of first sign-ins by membership-less users result in exactly one workspace and one
  owner membership — never zero, never two — across both providers and across retried/concurrent
  attempts.
- **SC-003**: 0% of sign-ins by users who already have a membership (including the seeded owner and
  account-linking users) create an additional workspace.
- **SC-004**: The seeded demo owner continues to land in the seeded workspace, with the app's
  workspace resolution and all existing screens behaving identically to before this slice (no
  observable change for existing users).
- **SC-005**: For a genuinely empty workspace, 100% of the surfaces a new user first reaches
  (dashboard, inbox, requests, and the remaining rail destinations) render without error and show an
  honest empty state or honest defaults.

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: N/A for the created content (a new workspace has no proof
  yet). The empty states honestly say "no proof yet" and point to collecting the first real customer
  proof — they never fabricate a headline customer.
- **Port, don't redesign (P-V)**: This is an auth-flow + data slice, not a UI port. The onboarding
  wizard designs (Drive "Onboarding", screens 15 + 17) **configure** a workspace and belong to the
  later wizard slice — they are **not** ported here. The empty states this slice touches already
  exist in-app (dashboard/inbox/requests/library/showcase/consent/brand); this slice verifies them
  against a truly empty workspace rather than introducing new layouts. No new layout is invented, so
  no P-XII gap arises.
- **Fixtures-first (P-VI)**: The new-workspace state is exercised on the real schema (an empty
  workspace is the honest zero-row case of the same tables the seed populates); the empty-state
  surfaces already read through the same query seam.
- **Consent (P-VII)**: N/A — no proof or derived asset is created by this slice. A new workspace has
  no proof and therefore no consent records; the consent surface renders its honest empty state.
- **No editor (P-VIII)**: N/A — no studio/format surface is in scope.
- **Scope (P-IX)**: Single vertical slice — first-sign-in bootstrap + honest empty-state verification.
  The onboarding wizard, workspace renaming UI, team invites, and multi-workspace switching are
  explicitly out of scope.
- **Microcopy (P-XVII)**: Any copy touched (default workspace name, empty-state CTAs) avoids
  "amazing"/"awesome" and emoji; the default name is plain and honest.
- **Port-completeness (P-XIII)**: The empty states are honest working states, not dead ends — the
  "collect your first proof" pointer leads to a real capture/request flow. No dead controls are added.
- **Owned data only (P-XIV)**: A bootstrapped workspace is genuinely empty — no fabricated starter
  proof, counts, or metrics. Every surface shows only real (here, zero) owned data.
- **Plan-not-code (P-XV)**: N/A — non-render slice.
- **No-LLM-in-render (P-XVI)**: N/A — non-render slice.

## Assumptions

- **Cores frozen (P-V).** The T6 auth schema (users / workspaces / memberships), the workspace-
  resolution seam, and the capture / consent / verification cores are unchanged except for the
  additive bootstrap hardening and the additive "not yet onboarded" signal. If correctness requires
  changing a frozen core, the work stops and surfaces the conflict.
- **Reuse T6 auth.** Magic-link (email) and Google are the two providers; both yield a verified
  email. No new provider and no new dependency are introduced. Account linking by verified email is
  the existing, deliberate T6 behavior and is relied on here.
- **Atomicity vehicle.** Because the datastore has no interactive transactions, atomic creation uses
  the existing batch multi-write pattern already used elsewhere for grouped inserts.
- **Trigger location.** The bootstrap is evaluated at sign-in (membership existence), which is
  strictly more robust than the existing user-creation-only hook and repairs pre-existing
  membership-less users. The exact hook/callback placement is a planning-phase decision.

### Recommended defaults for the open questions (baked into this spec; flag to change)

These were raised as open questions; each has a reasonable default, so the spec adopts the
recommendation rather than blocking. Flag any you want changed before `/speckit.plan`.

- **Auto-create vs. a minimal name step** → **Auto-create, no name prompt** (zero-friction; the
  wizard renames later). Adopted in FR-007.
- **"Not yet onboarded" flag now vs. defer** → **Add a cheap, honest flag now** (a nullable
  "onboarded" marker), so the future wizard has a real seam. This is the one **additive migration**
  in the slice; dropping it (defer) would remove the migration but leave the wizard without a
  detection signal. Adopted in FR-012.
- **Default workspace-name shape** → **`"{first name}'s workspace"`** when a name exists, otherwise
  **`"{email local-part}'s workspace"`** (grounded in the fields T6 actually stores: a nullable name
  + a verified email). Adopted in FR-007.
- **Empty-state scope** → **Verify existing honest empty states** on dashboard + inbox + requests
  (minimum) and the remaining rail destinations (library / showcase / consent / brand), fixing any
  that assume seeded data. **No new empty-state designs are ported**; onboarding screens 15/17 belong
  to the wizard slice. Adopted in FR-010 / FR-011.

### Out of scope

- The onboarding wizard (business-type / source / brand / format — the 5 Drive designs) and screens
  15/17.
- Workspace renaming UI, team invitations, and workspace switching for the new user.
- Any new authentication provider or third-party dependency.
