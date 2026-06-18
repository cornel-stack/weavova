# Feature Specification: Brand-asset store (reusable owned footage, attachable to proof)

**Feature Branch**: `T4-B2-brand-asset-store`

**Created**: 2026-06-18

**Status**: Draft — **3 clarifications OPEN** (Q1 store surface / P-V gap · Q2 lifecycle: detach + delete ·
Q3 `kind` taxonomy). See **Clarifications**. Not ready for `/speckit.plan` until resolved.

**Tier**: T4 — Bulk & exports (T4-B2 — Brand-asset store; the second T4 slice, after T4-B1 Batch studio).

**Input**: User description: "T4-B2 — Brand-asset store: a reusable library of brand-OWNED clips (product
videos, b-roll) that can be attached to consented proof so the rendered clip can include them. The consented
customer proof stays the HEADLINE; the brand footage is SUPPORTING CONTEXT, never the lead, never presented as
proof. Uploaded once, attachable to many proofs (many-to-many). Real R2 upload + store + attach now; the
composite into the rendered output stays an honest T8 seam."

**Ported from**: **No direct `/design-reference` screen exists for a reusable brand-asset store.** Design-
reference **B2 ("Add proof (upload)")** is a *different* thing — manual upload of **customer proof**, not the
brand's own footage. This slice is therefore a **derived surface** (precedent: T3.2 clip detail had no
design-reference screen and was derived from neighbouring layouts), built on the Pressroom tokens and the
existing app chrome (T1). Its **home/surface is the subject of Q1** (P-V / P-XII: where the design does not
cover a layout, raise it — do not invent).

---

## Overview

The Brand-asset store is the **"my own footage, woven in for context"** capability. A brand has product
videos and b-roll of its own — and when a customer says *"this drill changed my workflow,"* the rendered clip
can cut to the actual product. Those are the **brand's own assets**, reused across many testimonials, so they
live in a **reusable, workspace-scoped store**: **uploaded once, attachable to many proofs**.

The one law holds: **the consented customer proof stays the HEADLINE; the brand footage is SUPPORTING
CONTEXT** — never the lead, never counted as proof, never presented as proof (FR-019, P-II).

This slice ships **three real, working things** (A-11 — every control ships working):

1. **Upload → store.** Upload a clip; it is **genuinely uploaded to Cloudflare R2** (the same store that
   already holds the sample clip), validated for file-type and size, with **honest upload states**
   (`uploading` / `stored` / `failed`). On success it becomes an **owned brand asset** with a label, persisted
   and reusable.
2. **Attach (many-to-many).** Attach a brand asset to a proof — **one asset → many proofs, one proof →
   several assets** — a genuine, persisted association.
3. **Honest T8 seam.** The attachment shows **honestly** that the asset **will appear in the rendered clip
   when rendering ships** — because **compositing brand footage with proof is the render engine (T8)**. Today
   "Make clip" still returns the **stubbed sample** (FR-019, the same seam the "Sample preview" still stands
   in behind). B2 ships upload + store + attach; **the composite itself stays an honest "arrives with
   rendering (T8)" state** — no fake combined-output preview.

**Consent (P-VII) is unchanged and sovereign.** Brand assets are the brand's **own owned footage**; they do
**not** pass through the customer-consent gate — uploading, storing, or attaching one **never asks for
customer consent**, because a brand asset **isn't customer proof**. BUT attaching an asset to a proof **does
not bypass that proof's consent state**: a withdrawn proof still **cannot produce a clip**, asset attached or
not. The proof's **effective-consent gate** (the shared `effectiveConsentState` / `getGrantedConsentId`)
remains the **SOLE gate** on clip generation; brand assets sit **outside** it and never touch it.

**Schema (first change since `derived_asset`, T2.4a).** Additive only: a new **owned brand-asset table**
(workspace-scoped) plus a **many-to-many proof ↔ brand-asset association** (workspace-scoped join). **No change**
to existing tables, the consent model, `derived_asset`, or the proof / clip / showcase **read shapes**. The
migration mechanism is a plan-stage concern; the *contract* (additive, owned-only) is fixed here.

**Real R2 now (mechanism deferred to plan).** A **genuine server-side upload to R2 is required** — flagged
here so the plan addresses it; the **mechanism** (presigned vs server-proxied, whether it needs a client/
dependency such as an S3-compatible SDK) is a **PLAN-stage decision** and is **not** picked in this spec. If
it genuinely requires a dependency, that is the project's **first conscious dependency decision** and MUST be
raised explicitly at plan, not slipped in.

**Byte-stable everywhere else.** **ProofCard**, the **proof / clip / showcase read shapes**, **generateClip**,
and **generateBatch** stay **behaviorally unchanged**. Proof detail **MAY** gain an **additive, honestly-
labeled "attached brand assets" section** (a legitimate new feature on that surface) — but existing data
contracts and untouched surfaces stay **byte-identical**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upload a clip into the reusable store (Priority: P1)

A workspace owner uploads one of their own clips (a product video or b-roll); it really uploads to R2, is
validated, and — once stored — becomes a labeled, owned brand asset that persists and can be reused.

**Why this priority**: It is the slice's foundation and MVP — there is no store, and nothing to attach, until
upload genuinely works. It is the one part that ships **real R2** now.

**Independent Test**: Upload a valid video file; observe the honest `uploading → stored` states; confirm the
file is actually in R2 and a labeled owned brand asset persists (visible on reload). Upload an invalid type /
oversize file; confirm it is rejected honestly (validation message), nothing is stored, and the control
recovers.

**Acceptance Scenarios**:

1. **Given** the store surface, **When** the owner selects a valid clip and uploads, **Then** the upload runs
   to **R2** with an honest **in-progress** state and, on success, a **labeled owned brand asset** is
   persisted and listed (clearly the **brand's own footage**, not proof).
2. **Given** an invalid file (wrong type or over the size cap), **When** the owner attempts upload, **Then**
   it is **rejected honestly** before/at storage (clear reason), **nothing** is written to R2 or the store,
   and the control returns to a usable state.
3. **Given** an upload that fails mid-flight (transient/network), **When** it fails, **Then** the asset shows
   an honest **`failed`** state (no half-made asset presented as stored) and the owner can retry.

---

### User Story 2 - Attach brand assets to a proof (many-to-many) (Priority: P1)

From a proof, the owner attaches one or more brand assets (chosen from the reusable store) as **supporting
context**; the association persists, and the same asset can be attached to many proofs.

**Why this priority**: It is the slice's point — the store is only valuable once footage can be **reused
across testimonials**. Equal-P1 with upload; together they are the buildable-now value.

**Independent Test**: On a proof, attach 1–2 brand assets from the store; confirm the attachments persist
(visible on reload) and that the same asset attached to a second proof persists independently (many-to-many).
Detach one; confirm it is removed from that proof only (the asset and its other attachments survive).

**Acceptance Scenarios**:

1. **Given** a proof and a non-empty store, **When** the owner attaches a brand asset, **Then** a **persisted
   association** is created (proof ↔ brand-asset), shown in an honestly-labeled **"attached brand assets"**
   section on proof detail, framed as **supporting context** (never as proof).
2. **Given** an asset attached to proof A, **When** the owner attaches the **same** asset to proof B, **Then**
   both associations exist independently (**one asset → many proofs**), and one proof can hold **several**
   assets (**one proof → many assets**).
3. **Given** an attached asset, **When** the owner removes it from that proof, **Then** the **association** is
   removed for that proof only; the **asset itself** and any other proof's attachment are **unaffected** (per
   Q2 lifecycle).

---

### User Story 3 - The attachment is honest about the T8 composite (Priority: P1)

The owner sees clearly that the attached brand footage **will appear in the rendered clip once rendering ships
(T8)** — and that today the clip is still the **sample stub**. No fake combined-output preview.

**Why this priority**: Honesty about the deferred composite (FR-019, A-11) is the load-bearing promise of the
slice — the difference between a real seam and a lie. Equal-P1 with upload + attach.

**Independent Test**: Attach an asset to a granted proof and generate a clip; confirm the generated clip is
still the **honest sample/preview** (unchanged from today — `generateClip` is byte-stable), and the attached-
asset UI states **honestly** that the asset arrives in the output **with rendering (T8)** — with **no**
fabricated composited preview anywhere.

**Acceptance Scenarios**:

1. **Given** a proof with attached brand assets, **When** the owner generates a clip, **Then** the result is
   the **existing honest sample/preview** (generateClip / generateBatch behavior **unchanged**), and the
   attachment is **not** composited into it (that is T8).
2. **Given** the attached-asset section, **When** it is shown, **Then** it states **honestly** that the asset
   **will be included when rendering ships (T8)** — an explicit deferred state, **never** a fake combined
   preview or a claim the asset is already in the output.
3. **Given** a brand asset anywhere it appears, **When** it is displayed, **Then** it is **clearly the
   brand's own footage** — never displayed as, counted as, or labeled as customer proof (FR-019).

---

### User Story 4 - Consent stays the sole gate; brand assets sit outside it (Priority: P1)

Uploading/storing/attaching a brand asset never asks for customer consent (it isn't proof) — but attaching one
to a **withdrawn** proof still **cannot** produce a clip. The proof's effective-consent gate is untouched.

**Why this priority**: Consent Is Sacred (P-VII, NON-NEGOTIABLE). The highest-leverage failure here would be
a brand asset appearing to "unlock" a non-consented proof. It must not — equal-P1.

**Independent Test**: Attach an asset to a proof whose effective consent is **not granted**; confirm **no
clip** can be generated for it (the existing gate still blocks it — asset attached or not), and that attaching
the asset **never prompted for customer consent**. Withdraw a granted proof that has attachments; confirm the
existing withdrawal behavior is unchanged.

**Acceptance Scenarios**:

1. **Given** a proof whose effective consent is not `granted`, **When** a brand asset is attached to it,
   **Then** the attach **succeeds** (it is owned footage, no consent prompt) but the proof **still cannot
   generate a clip** — the existing `getGrantedConsentId` / `effectiveConsentState` gate is the **sole** gate
   and is **unchanged**.
2. **Given** uploading or attaching a brand asset, **When** it happens, **Then** the **customer-consent flow
   is never invoked** (no consent row, version, or prompt) — brand assets sit **outside** the consent model.
3. **Given** a granted proof with attachments that is later **withdrawn**, **When** withdrawal cascades,
   **Then** the existing withdrawal/cascade behavior over `derived_asset` and the read-time filters is
   **unchanged** by this slice (brand assets do not alter it).

---

### Edge Cases

- **Empty store**: the attach affordance on a proof shows an honest empty state ("no brand assets yet —
  upload one") and a path to upload; never a fake/sample asset.
- **Attaching the same asset twice to one proof**: the association is idempotent per (proof, asset) — a second
  attach is a no-op (or surfaced as "already attached"), not a duplicate row.
- **Upload validation boundaries**: wrong MIME/extension and over-size are rejected **before** an asset row is
  created; honest reason shown; no orphaned R2 object presented as a stored asset.
- **Upload succeeds in R2 but the DB write fails (or vice-versa)**: the asset is shown in its true state
  (`failed` / not-stored), never as a stored asset it isn't — no half-made asset faked as complete.
- **Detach vs delete (Q2)**: removing an asset **from a proof** (detach) is distinct from **deleting the asset
  from the store**; whether store-delete ships in B2 and how it treats existing attachments is **Q2**.
- **A clip already generated before attaching**: pre-existing sample clips are unchanged; the attachment is
  forward-looking (it affects the T8 render), and the UI says so honestly — it does not retro-claim past clips
  include the asset.
- **Brand asset never masquerades as proof**: it is excluded from proof counts, the inbox, the showcase's
  proof set, and any "real customer proof" framing (FR-019) — it is the brand's own context footage.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (reusable owned store)**: The system MUST provide a **workspace-scoped, reusable store** of the
  brand's **own** uploaded clips. An uploaded clip becomes an **owned brand asset** with at least a **label**
  and a **kind** (e.g. product video / b-roll — taxonomy is **Q3**), persisted and **reusable across many
  proofs**. The store and every asset are clearly **the brand's own footage**, never proof (FR-019).
- **FR-002 (real R2 upload — mechanism deferred)**: Upload MUST perform a **genuine server-side upload to
  Cloudflare R2** (the store already used for the sample clip). The **mechanism** (presigned vs proxied;
  whether it requires a client/dependency) is a **PLAN-stage decision** and is **NOT** chosen here — but the
  spec **flags that real R2 upload is required** so the plan addresses it. Any resulting dependency is the
  project's **first conscious dep decision**, raised explicitly at plan (P-III).
- **FR-003 (file validation)**: Upload MUST validate **file type** and **size** before/at storage and
  **reject** anything outside the allowed set with an **honest reason** — without writing an asset row or
  leaving an orphan presented as stored. (Allowed types / size cap default in **Assumptions**, confirmable at
  plan.)
- **FR-004 (honest upload states — A-11)**: Upload MUST present **honest states** — **`uploading`**,
  **`stored`**, **`failed`** — with an on-token in-progress indicator. A failed/partial upload MUST show its
  **true** state and be **retryable**; it MUST NOT be presented as stored.
- **FR-005 (attach — many-to-many)**: The owner MUST be able to **attach** a brand asset (chosen from the
  store) to a proof, creating a **persisted association**. The relationship MUST be **many-to-many** — one
  asset attachable to **many proofs**, one proof holding **several assets**. Attaching the same asset to the
  same proof MUST be **idempotent** (no duplicate association).
- **FR-006 (detach)**: The owner MUST be able to **remove an attachment from a proof** (detach); this removes
  the **association for that proof only** and leaves the **asset** and its other attachments intact. (Whether
  **store-delete** also ships, and its cascade, is **Q2**.)
- **FR-007 (honest T8-composite seam — FR-019 / A-11)**: The attachment MUST state **honestly** that the asset
  **will appear in the rendered clip once rendering ships (T8)** — an explicit **deferred** state. There MUST
  be **no fabricated combined-output preview** and **no claim** the asset is already in the output. The actual
  composite is **T8**, behind the same seam the "Sample preview" stub stands in for today.
- **FR-008 (clip generation unchanged — byte-stable)**: `generateClip` and `generateBatch` MUST remain
  **behaviorally unchanged** — they still return the **honest sample/preview stub** (`SAMPLE_CLIP_URL`); they
  MUST NOT begin compositing or alter their output because an asset is attached (that is T8). Attaching an
  asset MUST NOT change the generated result in B2.
- **FR-009 (consent is the sole gate — P-VII)**: Uploading, storing, or attaching a brand asset MUST **never**
  invoke the customer-consent flow (no consent row/version/prompt) — brand assets sit **outside** the consent
  model. Attaching an asset to a proof MUST **not** bypass that proof's consent: the existing
  **`getGrantedConsentId` / `effectiveConsentState`** gate stays the **SOLE** gate on clip generation and is
  **unchanged** — a non-granted proof still cannot produce a clip, asset attached or not.
- **FR-010 (consent cascade untouched)**: This slice MUST NOT alter the existing **withdrawal/cascade**
  behavior over `derived_asset` or any read-time consent filter. Brand assets are not derived from proof and
  do not enter the cascade (they are owned footage, not customer proof).
- **FR-011 (owned-data honesty — FR-019)**: A brand asset MUST be **clearly the brand's own footage**
  everywhere it appears, and MUST **never** be displayed as, **counted as**, or **masquerade as** customer
  proof. It MUST be **excluded** from proof counts, the proof inbox, the showcase proof set, and any "real
  customer proof" framing. The only owned values shown are real (no fabricated metric/reach).
- **FR-012 (additive schema only)**: The slice MUST introduce **only additive schema** — a new
  **workspace-scoped owned brand-asset table** (id, workspaceId, kind, label, assetUrl, createdAt) and a
  **workspace-scoped many-to-many proof ↔ brand-asset join**. It MUST make **no change** to existing tables,
  the **consent model**, **`derived_asset`**, or the **proof / clip / showcase read shapes**. (Migration
  mechanism is a plan concern; the additive, owned-only contract is fixed here.)
- **FR-013 (byte-stable surfaces)**: **ProofCard**, the **proof / clip / showcase read shapes**,
  **`generateClip`**, and **`generateBatch`** MUST stay **byte-stable / behaviorally unchanged**. Proof detail
  **MAY** gain an **additive, honestly-labeled "attached brand assets" section**; all other untouched surfaces
  and existing data contracts stay **byte-identical**.
- **FR-014 (distinct from Brand kits — T5)**: This is the **reusable-FOOTAGE store** ("my product videos /
  b-roll"). It MUST be kept **DISTINCT** from T5's **Brand kits** (identity: logo / colours / fonts for
  styling). The two MUST NOT be merged; B2 is **uploadable reusable clips only**.
- **FR-015 (no editor — P-VIII)**: This slice MUST be **attach an asset, not compose a video**. There MUST be
  **NO timeline, NO trimming, NO sequencing, NO compositor**, and **no** control that lets the user manually
  edit/arrange/place video. The user **supplies material**; the automated render template (T8) **arranges**
  it. Any manual-edit control is out of scope.
- **FR-016 (reliability)**: Reads MUST follow the established reliability pattern (`withDbRetry`-wrapped,
  transparent cold-start recovery, the shared **`<ErrorState>`** on a genuine failure). Writes (the asset
  insert and the attach/detach) follow the project's established write pattern (mechanism/retry posture
  confirmed at plan, consistent with the D4 single-attempt convention where applicable).
- **FR-017 (responsive + keyboard)**: Upload, the store list, the attach picker, the attached-asset section,
  and detach MUST be **responsive** across the Pressroom breakpoints (480 / 1024 / 1280 + 1240 max) and fully
  **keyboard-accessible** with visible focus (choose file, upload, attach, detach, dismiss).
- **FR-018 (microcopy / honesty — P-XI)**: Microcopy MUST be **honest** about the sample stub, the deferred
  T8 composite, and the brand-owned (non-proof) nature of these assets; it MUST avoid "amazing"/"awesome" and
  emoji.
- **FR-019 (scope)**: The slice MUST NOT build: the **T8 render/composite** (clips stay sample-stubbed); **T5
  Brand kits** (identity styling); design-reference **B2 "Add proof (upload)"** (manual *customer-proof*
  upload — a different feature); **Warmth sort (B3)** or **Export (B4)** (other T4 slices); any **editor/
  compositor** (P-VIII); the public showcase distribution (T9). It MUST keep the schema **additive-only**,
  keep ProofCard / read shapes / generateClip / generateBatch byte-stable, and add **no new dependency unless
  the R2 upload mechanism genuinely requires one** — raised explicitly at plan (P-III).

### Key Entities *(include if feature involves data)*

- **Brand asset (NEW — owned footage)**: the brand's **own** uploaded clip in the reusable store. Workspace-
  scoped. Attributes: `id`, `workspaceId`, `kind` (product video / b-roll — taxonomy Q3), `label`,
  `assetUrl` (the R2 object), `createdAt`. **Not** customer proof; **not** in the consent model; **never**
  counted as proof (FR-019).
- **Proof ↔ brand-asset attachment (NEW — join)**: a **workspace-scoped many-to-many** association linking a
  proof to a brand asset (supporting context for that proof's eventual T8 render). Idempotent per (proof,
  asset). Detachable per proof. Does **not** carry or affect consent.
- **Proof** (existing — T0.3): gains an additive "attached brand assets" relationship for display; its
  **effective consent** remains the **sole** gate on clip generation, **unchanged** by attachments.
- **Consent** (existing — T0.3): **untouched** — brand assets sit outside it; no new consent rows/versions.
- **Derived asset / clip** (existing — T2.4a): **unchanged** — still the honest sample stub; the brand-asset
  composite is **T8**. No schema change to this table.
- **NOT modelled here**: any render/composite job, T5 brand-kit identity entity, warmth/sort ranking, export
  artifact, or success metric — later slices / not owned; not fabricated (FR-019, A-11).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An owner uploads an owned clip and sees it become a labeled, persisted brand asset (genuinely in
  R2) in under 60 seconds on a typical connection, with honest `uploading → stored` states.
- **SC-002**: **100%** of invalid uploads (disallowed type or over the size cap) are **rejected** with an
  honest reason and **0** invalid/orphaned objects are presented as stored assets.
- **SC-003**: One asset attaches to **many** proofs and one proof holds **many** assets (verified many-to-
  many), every association **persists** across reload, and a duplicate (proof, asset) attach creates **0**
  duplicate rows.
- **SC-004**: **0** clips change output because of an attachment — `generateClip` / `generateBatch` produce
  the **same honest sample/preview** as before (byte-stable); **0** fabricated composited previews render
  anywhere.
- **SC-005**: **100%** of brand-asset surfaces label the asset as **the brand's own footage**; **0** instances
  of a brand asset counted as, or displayed as, customer proof (FR-019); brand assets appear in **0** proof
  counts / inbox / showcase proof set.
- **SC-006**: **0** customer-consent prompts/rows are created by uploading or attaching a brand asset; a
  non-granted proof with an attached asset still generates **0** clips (the existing gate is the sole gate,
  unchanged).
- **SC-007**: Schema change is **additive-only** — **0** changes to existing tables, the consent model,
  `derived_asset`, or the proof / clip / showcase read shapes; ProofCard / generateClip / generateBatch are
  **byte-stable**.
- **SC-008**: Upload, store, attach picker, attached section, and detach are responsive at each breakpoint
  (≤480, 1024, 1280, 1240px max) and fully keyboard-operable; a genuine failure shows the shared error state.
- **SC-009**: **0** out-of-scope controls render — no editor/timeline/compositor, no T5 brand-kit styling, no
  customer-proof upload (design-reference B2), no warmth/export, no fake composite (A-11, P-VIII).
- **SC-010**: **No new dependency** is added **unless** the R2 upload mechanism genuinely requires one — and
  if so it is the **first conscious dep decision**, recorded at plan (not in this spec).

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: The brand footage is **supporting context, never the lead**. On every
  surface the **customer's proof stays the headline**; the attached-asset section is a quiet, secondary,
  honestly-labeled addition — never elevated above, or confused with, the customer's words.
- **Locked stack (P-III)**: Next 15 / React 19 / TS strict, Tailwind v4 + tokens, Neon + Drizzle, **R2** for
  the real upload. The **R2 upload mechanism is a plan decision**; any dependency it requires is the project's
  **first conscious dep decision**, raised explicitly at plan — not assumed here. Heavy render/composite stays
  off Vercel until T8; clips stay sample-stubbed.
- **Port, don't redesign (P-V)**: **No design-reference screen exists** for a reusable brand-asset store
  (design-reference **B2 is "Add proof (upload)"**, a different feature). Per **P-XII**, this gap is **raised
  as Q1** rather than invented; the surface is a **derived** one built on the existing chrome + tokens
  (precedent: T3.2 clip detail). The additive proof-detail "attached brand assets" section follows screen 03's
  existing section pattern.
- **Fixtures-first (P-VI)**: The new tables are shaped exactly like the real schema (the contract); seed data
  can include sample owned brand assets + attachments to exercise the store, attach, and the honest T8 state —
  clearly owned, never proof.
- **Consent (P-VII)**: **Unchanged and sovereign.** Brand assets are owned footage **outside** the consent
  model — upload/store/attach **never** prompt for customer consent. The proof's **effective-consent gate
  remains the SOLE gate** on clip generation; a non-granted proof cannot produce a clip, attached asset or
  not; the withdrawal cascade over `derived_asset` is untouched.
- **No editor (P-VIII)**: Honoured — this is **attach an asset, not compose a video**. No timeline, trim,
  sequence, or compositor; the automated render template (T8) arranges material the user supplies.
- **Scope (P-IX, P-XI)**: One vertical slice — real upload + reusable store + many-to-many attach + the honest
  T8 seam. The composite (T8), Brand kits (T5), customer-proof upload (design-reference B2), warmth/export
  (other T4 slices), and any editor are **out of scope**. No speculative additions.
- **Microcopy (P-XI)**: Honest about the sample stub, the deferred T8 composite, and the brand-owned (non-
  proof) nature of the footage; no "amazing"/"awesome"/emoji.
- **Handling ambiguity (P-XII)**: The missing design-reference surface, the asset lifecycle, and the `kind`
  taxonomy are raised as **Q1–Q3** against the named references, not guessed. The R2 upload **mechanism** and
  any dependency are deferred to plan by design (flagged, not chosen).

## Assumptions

- **A-01 (derived surface, no design-reference port)**: With no design-reference screen for the store, B2 is a
  **derived surface** on the existing chrome + Pressroom tokens (precedent: T3.2). Its exact home is **Q1**.
- **A-02 (real R2 now; mechanism at plan)**: The upload is a **genuine R2 upload** into the existing sample
  bucket/account; the **mechanism** (presigned multipart vs server-proxied, and whether a client/dependency is
  needed) is decided at **plan** (P-III), not here.
- **A-03 (upload constraints — default, confirm at plan)**: Default allowed types = common web-deliverable
  **video** formats (e.g. MP4/MOV/WebM); default **size cap** a single sensible bound (e.g. ~100 MB) suited to
  short product clips. Exact list/cap confirmed at plan; this is an assumption, not a hard requirement.
- **A-04 (additive schema, owned-only)**: New owned brand-asset table + many-to-many join, both workspace-
  scoped, with `onDelete` posture matching existing conventions (workspace cascade; proof/asset cascade on the
  join). **No** change to existing tables / consent / `derived_asset` / read shapes.
- **A-05 (attach from proof detail; store browse per Q1)**: Attaching happens **from a proof** (proof detail's
  additive section); the store **browse/upload** home is **Q1** (dedicated route vs proof-detail-inline vs
  extend an existing surface).
- **A-06 (detach in scope; store-delete per Q2)**: **Detach** (remove an attachment from a proof) ships so the
  attach control is honestly reversible (A-11). Whether **delete-from-store** (and its cascade to existing
  attachments) ships in B2 is **Q2**.
- **A-07 (clip output unchanged)**: `generateClip` / `generateBatch` are byte-stable — the attached asset does
  **not** alter the sample-stub output; the composite arrives at **T8** behind the same seam.
- **A-08 (reuse the reliability stack)**: `withDbRetry` on reads; the shared `<ErrorState>` for a genuine
  failure; writes follow the established convention (posture confirmed at plan).

## Clarifications

> Three items are surfaced (P-XII + P-V gap + A-11). They are **OPEN** — please resolve before `/speckit.plan`.
> The R2 upload **mechanism** and any **dependency** are deliberately deferred to plan (flagged in FR-002 /
> A-02), not asked here.

### Question 1 — Store surface / home (no design-reference port)

**Context**: There is **no `/design-reference` screen** for a reusable brand-asset store (design-reference
**B2 is "Add proof (upload)"**, a different feature). Per P-V/P-XII the surface must be decided, not invented.
Attaching itself happens from a proof (proof detail's additive section); the question is where the **store
browse + upload** lives.

| Option | Answer | Implications |
|--------|--------|--------------|
| **A** | **A new dedicated route** under `/app` (e.g. an "owned footage" library), distinct from T5 Brand kits | Clear reusable home to browse/upload/manage assets; attach pulls from it. A derived route with no design-reference basis (honestly labeled). Most "store"-like; matches "uploaded once, reused many". |
| B | **Proof-detail only** (no standalone store): upload + pick happen inline on a proof; the "store" is implicit (all the workspace's assets, surfaced in the attach picker) | Smallest surface; no new route. But no dedicated place to browse/manage owned footage independent of a proof; reuse is only visible through the picker. |
| C | **Extend an existing surface** (e.g. the Library) with an owned-footage section/tab | Reuses a built surface; but risks blurring derived clips (proof-owned) with brand-owned footage — must stay clearly separated (FR-019). |
| Custom | — | e.g. a route **plus** inline upload-from-proof for convenience. |

**Recommendation**: **A** (dedicated route) + inline attach from proof — cleanest "reusable store" with an
honest derived home; keeps owned footage clearly distinct from proof and from T5 brand kits.

### Question 2 — Asset lifecycle: detach + delete-from-store

**Context**: A-11 says every control ships working, so **detach** (remove an attachment from a proof) is in
scope (FR-006). Open: does **delete-from-store** (removing the owned asset entirely) ship in B2, and if so how
does it treat existing attachments and the R2 object?

| Option | Answer | Implications |
|--------|--------|--------------|
| **A** | **Detach only in B2**; delete-from-store deferred | Smallest honest slice: attachments are reversible; assets accumulate in the store (no permanent delete yet). No cascade questions. Deletion arrives later. |
| B | **Detach + delete-from-store**, where delete **cascades** (removes the asset, all its attachments, and the R2 object) | Full lifecycle now; but adds a cascading destructive action + R2 object cleanup to design and confirm carefully. |
| C | **Detach + delete-from-store, but block delete while attached** (must detach everywhere first) | Safer delete (no surprise cascade); but a multi-step chore for the user; still needs R2 cleanup on the final delete. |
| Custom | — | e.g. soft-delete / archive instead of hard delete. |

**Recommendation**: **A** (detach only in B2) — keeps the slice tight and honest; full delete + R2 cleanup is
a clean follow-up, not load-bearing for the store's value.

### Question 3 — `kind` taxonomy (the asset's type)

**Context**: The owned-asset table has a `kind` column; the brief names "product videos, b-roll". Open: is
`kind` a **fixed enum** or a **free label**, and what values?

| Option | Answer | Implications |
|--------|--------|--------------|
| **A** | **Fixed enum**: `product` (product video) + `broll` (b-roll) | Matches the brief exactly; clean filtering/labeling; a `pgEnum` like the existing ones. Extensible later by migration. |
| B | **Single kind now** (just "brand clip") with a free-text **label** carrying the distinction | Simplest schema (no enum); the user's label does the describing. Less structured; harder to filter by type. |
| C | **Fixed enum with more values** (e.g. product / broll / logo-sting / testimonial-bg) | More expressive up front; but speculative beyond the brief (P-IX) — adds values we don't yet have a use for. |
| Custom | — | e.g. enum `product`/`broll` **plus** a free label (recommended pairing). |

**Recommendation**: **A** (`product` + `broll` enum) alongside the existing free `label` — matches the brief,
mirrors the existing `pgEnum` convention, avoids speculative values.
