# Feature Specification: T7.4a — Consent-Media Remediation

**Feature Branch**: `T7.4a-consent-media-remediation`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description: "T7.4a — Consent-media remediation. The T7.4 investigation found that
captured customer media is persisted as a PUBLIC, unsigned, permanent URL, consent withdrawal never
reaches the R2 file (P-VII gap), and the worker GET is malformed (receives a URL where a key is
expected, so normalize fails on real data). Make customer-media storage consent-correct and fix the
worker, WITHOUT building T8 playback. Brand assets stay public."

## Context — what the T7.4 trace found (the problem this slice closes)

A read-only investigation after T7.4 established three facts about **customer proof media** (the
video/photo a customer records at `/c/[token]`):

1. **It is persisted as a public, unsigned, permanent URL.** The capture write-path stores
   `assetUrlForKey(key)` — `R2_PUBLIC_BASE_URL + key`, no signing, no expiry — on the proof. Anyone
   who obtains that URL can fetch the file directly from storage, bypassing the app forever.
2. **Consent withdrawal never reaches the file.** Withdrawal records a new `revoked` consent
   version (hiding the proof in-app and blocking clip generation), but it does **not** delete or
   revoke the stored media object. No deletion primitive exists anywhere in the codebase. The
   constitution's "revocation cascades to every derived asset" (P-VII) stops at the app boundary.
3. **The normalize worker is broken on real data.** The worker expects a storage **key** but is
   handed the public **URL** (the format mismatch from #1), so its fetch of the original object is
   malformed — normalize would not correctly process a real captured object.

Keys are UUID-based (unguessable), so the live exposure is "public-but-unlinked" — permanent
unauthenticated access for any URL-holder, not mass-enumerable. That is still a P-VII violation:
the customer who withdraws consent expects their footage to be gone, and it is not.

This slice makes consent-bearing customer media **private and consent-correct**, fixes the worker,
and establishes the mediated-read pattern for future playback — **without building T8 playback**.
**Brand assets** (logos, brand-kit images, brand footage) are the merchant's own marketing with **no
consent dimension**; they stay public and are explicitly **not touched**.

### The core principle: two object classes, two access models

| Object class | Examples | Access model | Consent dimension |
|---|---|---|---|
| **Consent-bearing customer media** | captured proof media; the worker's normalized output | **PRIVATE** — stored as a key, read via a mediated/expiring path, **deleted on withdrawal** | Yes — P-VII applies |
| **Brand assets** | logos, brand-kit images, brand footage | **PUBLIC** — unchanged (`assetUrlForKey`) | No — owned marketing |

Aligning the storage boundary with the consent boundary is the whole point of the slice.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Withdrawing consent removes the customer's footage (Priority: P1) 🎯

A customer who appeared in a captured proof revokes their consent (the Leo M. / T7.1 model). Today
the proof disappears from the merchant's app, but the underlying media file remains permanently
fetchable by anyone holding its URL. After this slice, withdrawing consent **also removes the actual
media object from storage** — the footage is gone, not merely hidden.

**Why this priority**: This is the P-VII gap itself — "Consent Is Sacred (NON-NEGOTIABLE)". A
withdrawal that leaves the file publicly fetchable is the difference between real proof and
exploitation. It is the reason the slice exists.

**Independent Test**: Capture a proof with media → note that its media is reachable through the
mediated read → withdraw consent for that proof → confirm the media object is no longer retrievable
(the file is deleted; any previously-derived reference resolves to "not available"), while the proof
row and its consent history are retained for audit.

**Acceptance Scenarios**:

1. **Given** a proof with stored customer media and granted consent, **When** consent is withdrawn,
   **Then** the captured media object **and** any normalized media object for that proof are deleted
   from storage, and a subsequent attempt to fetch either returns "not available".
2. **Given** a proof whose consent is later withdrawn, **When** an auditor reviews the consent
   ledger, **Then** the consent history (including the `revoked` version) is intact — only the media
   file is gone, not the consent record.
3. **Given** a withdrawal is requested while the worker is still normalizing that proof's media,
   **When** the worker goes to record its output, **Then** no orphaned media object survives: the
   normalized write is an **atomic conditional UPDATE** gated on effective consent (`… WHERE id =
   :proofId AND <effective-consent-granted>`), so a withdrawal during normalize causes the write to
   affect **0 rows** — the worker then deletes its just-produced normalized object and does NOT persist
   the URL (no read-then-write window). On that path the worker sets a **terminal** `media_status =
   'failed'` (it is NOT left at `normalizing`; `'failed'` is reused because `media_status` is an enum
   and a dedicated `'withdrawn'` value would need a migration, which this slice forbids). The resolver
   hides the proof regardless, so this status is honest-but-cosmetic — its only job is that no media
   proof lingers in a non-terminal state.
4. **Given** a text proof (no media) whose consent is withdrawn, **When** the deletion runs, **Then**
   it is a no-op with no error (nothing to delete).

---

### User Story 2 — Customer media is stored privately, and normalize works (Priority: P1)

The capture write-path stores the **storage key** for customer media (matching what the schema
comment already claims it holds), not a public URL. As a direct consequence, the normalize worker —
which expects a key — can correctly fetch the original object and produce a normalized version.

**Why this priority**: Two defects fixed at once. (a) Persisting a public URL is the storage-layer
root cause of the P-VII gap and the format inconsistency (captured = URL, normalized = key). (b) The
worker is **currently broken on real data** because of that mismatch — normalize cannot run until
this lands. This is why remediation precedes the T7.4 live walk.

**Independent Test**: Capture a video proof → confirm the proof persists a **key** (not a public
`http…` URL) for its media → run the normalize worker against that proof → confirm the worker fetches
the original successfully and records a normalized object, with the captured original retained and
status honest.

**Acceptance Scenarios**:

1. **Given** a customer captures a video at `/c/[token]`, **When** the proof is written, **Then**
   `proof.mediaUrl` holds the storage **key**, not a public URL.
2. **Given** a captured video proof, **When** the normalize worker processes its `media.captured`
   event, **Then** it fetches the original object by key successfully (no malformed request) and
   writes a normalized object; on success `media_status` is `normalized` and the original is retained.
3. **Given** the normalize fetch fails (corrupt/missing object), **When** the worker exhausts its
   retries, **Then** `media_status` is `failed`, the original reference is retained, and no partial
   normalized reference is recorded (the T7.4 failure contract is preserved).
4. **Given** a normalized object is written, **When** its storage location is examined, **Then** it
   is a **key** in the consent-bearing media space (never a persisted public URL).

---

### User Story 3 — A mediated read path exists for customer media (Priority: P2)

Any future read of customer media (notably T8 playback) resolves through a **mediated, expiring**
access path that can be gated on the consent resolver — never a raw public URL. Because nothing
renders customer media today (the T7.2 seam is non-playing), this slice **establishes the pattern
and the access helper only** — it does **not** build a playback UI.

**Why this priority**: It locks in the correct read architecture so T8 cannot accidentally
re-introduce a public-URL read. It is P2 because there is no live consumer yet — the non-playing
seam stays exactly as-is; this is forward-contract plumbing, not a user-visible feature.

**Independent Test**: Request a mediated read reference for a consent-bearing media object → confirm
it is time-limited and access-controlled (not a permanent public URL) → confirm the existing
non-playing "media stored · playback coming" seam is unchanged and still renders no `<video>`/`<img>`.

**Acceptance Scenarios**:

1. **Given** a consent-bearing media object exists, **When** a mediated read reference is requested,
   **Then** the reference is time-limited (expires) and does not expose a permanent public URL.
2. **Given** the proof-detail surface for a media proof, **When** it renders, **Then** it shows the
   unchanged non-playing seam — no `<video>`, no `<img>`, no playback control (P-XIII honesty; T8
   builds playback).
3. **Given** a proof whose consent is not granted, **When** a mediated read is attempted (future T8
   consumer), **Then** the pattern allows the read to be denied by the consent resolver (the helper
   does not bypass consent).

---

### User Story 4 — Brand assets are unaffected (Priority: P2, regression guard)

Brand-owned assets (logos, brand-kit images, brand footage) continue to use the public access model
unchanged. The merchant's marketing has no consent dimension; nothing about its storage, URLs, or
rendering changes.

**Why this priority**: A correctness guard. The two-object-classes principle only holds if the brand
(public) path is provably untouched while the customer (private) path is hardened.

**Independent Test**: Render a brand logo / brand-kit image / brand footage card → confirm it still
loads from its public URL exactly as before this slice.

**Acceptance Scenarios**:

1. **Given** a workspace with a brand-kit logo, **When** the brand surfaces render, **Then** the logo
   loads from its public URL, unchanged.
2. **Given** brand footage in the store, **When** the footage surface renders, **Then** it behaves
   exactly as before (public access path untouched).

---

### Edge Cases

- **Live-captured proofs created before this fix** may already hold a **public URL** in `mediaUrl`
  (fixtures do not — the seed never sets media). A one-time normalization of any such rows
  (public URL → key) is needed so the worker and the withdrawal-delete path operate on a consistent
  key form. (See Assumptions — backfill, grounded in fixture reality.)
- **Withdrawal before normalize completes** (US1 #3): deletion must not leave an orphaned normalized
  object produced by a later-completing worker run.
- **Withdrawal of a proof with no media** (text): deletion is a no-op, no error.
- **Deletion of an already-absent object** (idempotent re-withdrawal, or media already gone): no
  error, no fabricated failure state.
- **Mediated read of a deleted/withdrawn object**: resolves to "not available", never a stale public
  URL.
- **Shared-bucket residual exposure** (if the single-bucket option is chosen): a constructed URL for
  a not-yet-deleted object remains fetchable; the open question below governs whether this residual
  is acceptable or eliminated by a private bucket.

## Requirements *(mandatory)*

### Functional Requirements

**Private storage of consent-bearing customer media**

- **FR-001**: The capture write-path MUST persist the storage **key** for customer proof media (not a
  public, unsigned URL). `proof.mediaUrl` MUST hold a key consistent with what the worker consumes.
- **FR-002**: The normalize worker's recorded output (`proof.normalized_media_url`) MUST remain a
  **key** in the consent-bearing media space — never a persisted public URL.
- **FR-003**: Consent-bearing customer media MUST NOT be persisted or surfaced anywhere as a
  permanent public URL.

**The worker fetch works**

- **FR-004**: Given a captured proof storing a key, the normalize worker MUST be able to fetch the
  original object by that key without a malformed request, and produce a normalized object.
- **FR-005**: The T7.4 normalize failure contract MUST be preserved: on failure, `media_status` is
  `failed`, the original is retained, and no partial normalized reference is recorded.

**Withdrawal cascades to the file (P-VII)**

- **FR-006**: A media-deletion capability MUST exist for consent-bearing media objects (none exists
  today).
- **FR-007**: Withdrawing a proof's consent MUST delete the proof's captured media object **and** any
  normalized media object for that proof, so the footage is no longer retrievable. The delete is
  **best-effort**: it runs after the authoritative `revoked`-version write and a transient storage
  failure MUST NOT fail the withdrawal (the consent record + resolver-hide remain the authoritative
  gate). On transient failure a residual window remains until a retry; the deletes are idempotent so
  retries are safe.
- **FR-007a** (cheap reconcile; defers a full sweep): The system MUST establish a
  **delete-if-withdrawn-on-access** reconcile — when a read or withdrawal touch encounters a withdrawn
  proof, it re-issues the (idempotent) `deleteCaptureObject` for the captured + normalized keys,
  shrinking the FR-007 residual window at near-zero cost without a background job. **Live this slice**:
  the worker's atomic `markNormalized` self-cascade (FR-010) and re-withdrawal idempotency.
  **Forward-contract**: the hook is wired into the mediated read path (`presignCaptureRead`), which has
  **no live consumer in this slice** (US3 establishes the path; T8 builds the reader) — so it is real
  plumbing inside the helper, not a dead control (P-XIII), and it activates when T8's reader lands. A
  periodic full orphan-sweep is **explicit future hardening, out of scope for this slice**.
- **FR-008**: Withdrawal MUST retain the proof row and the full consent history (including the
  `revoked` version) for audit — only the media **file** is removed, not the consent record.
  **Decision (recommended default): hard-delete the media object** (not a retained tombstone) — the
  consent record is what is retained for audit, not the media. The customer withdrew; the honest
  outcome is the footage is gone.
- **FR-009**: Withdrawal-deletion MUST be idempotent and safe for the no-media case: deleting an
  absent object (text proof, already-deleted, re-withdrawal) is a no-op with no fabricated error.
- **FR-010**: The system MUST NOT leave an orphaned media object after withdrawal when a normalize
  run completes after the withdrawal. This MUST be enforced **atomically**, not by a procedural
  read-then-write: the worker's normalized write is a single conditional UPDATE gated on
  effective-consent-granted, and a 0-row result MUST trigger deletion of the just-produced normalized
  object (the worker's own output is subject to the cascade). No file survives a withdrawal.

**Mediated read pattern (establish, not build playback)**

- **FR-011**: A mediated, **time-limited** read access path for consent-bearing media MUST be
  established (signed/expiring access — never a permanent public URL).
- **FR-012**: The mediated read pattern MUST be gateable on the consent resolver (a future reader can
  deny a non-consented read). This slice does NOT build a playback UI; the existing non-playing seam
  is unchanged.
- **FR-013**: The proof-detail media seam MUST remain the honest non-playing state — no `<video>`,
  `<img>`, or playback control is introduced (P-XIII; playback is T8).

**Brand assets unchanged**

- **FR-014**: The public access model for brand assets (logos, brand-kit images, brand footage) MUST
  be unchanged; their storage, URLs, and rendering behave exactly as before.

**Cores frozen / scope**

- **FR-015**: The capture token model, the T7.5 verification resolver, and the `/c/[token]` page UI
  MUST be unchanged. The only customer-facing capture edit is the action's media-persist value (a
  key instead of a public URL); the page is untouched. STOP-and-surface if a core needs real change.
- **FR-016**: No new application dependency may be introduced (the existing storage-signing path is
  reused for presign/delete).

**Bucket topology — RESOLVED → A (separate buckets)**

- **FR-017**: The system MUST store consent-bearing customer media such that, after withdrawal-delete,
  the object is genuinely unretrievable. **RESOLVED → Option A (separate buckets)**: a PUBLIC
  brand-assets bucket (existing, `media.weavova.com` / `R2_PUBLIC_BASE_URL` — unchanged) + a NEW
  PRIVATE customer-media bucket (`R2_CAPTURES_BUCKET`, **no public domain**, presigned-GET reads
  only). Customer media is private **by construction** — `assetUrlForKey` physically cannot address
  the captures bucket, so there is no permanent public URL to leak; the withdrawal-delete is
  belt-and-braces rather than the only protection. (See Clarifications → Decision.)

### Key Entities *(include if feature involves data)*

- **Captured customer media object**: the original video/photo a customer records at `/c/[token]`.
  Consent-bearing. Referenced by `proof.mediaUrl` as a **key**. Deleted on withdrawal.
- **Normalized customer media object**: the worker's processed output. Consent-bearing. Referenced by
  `proof.normalized_media_url` as a **key**. Deleted on withdrawal.
- **Brand asset object**: merchant-owned logo / brand-kit image / brand footage. **Not** consent-
  bearing. Referenced by a public URL. **Unchanged** by this slice.
- **Consent record (existing)**: versioned, revocable; the `revoked` version is the trigger for the
  media-deletion cascade and is itself retained for audit (the media file is what is removed).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a captured video proof is written, **100%** of the stored customer-media
  references are keys — **0** are public `http…` URLs.
- **SC-002**: After consent is withdrawn for a proof with media, the **consent record is the
  authoritative gate** — the resolver hides the proof and blocks every derived use in **100%** of
  cases, while the consent history remains fully intact. The media **file** delete is **best-effort
  and idempotently retried**: on a successful delete (the normal path) the captured **and** normalized
  objects are destroyed and a fetch attempt fails; on a transient R2 failure a residual window remains
  until a retry succeeds. The retry is the **delete-if-withdrawn-on-access** reconcile (FR-007a) plus
  the next withdrawal touch; a periodic full sweep is deferred future hardening (out of scope). The
  honest guarantee is: consent is gated 100% immediately; the file is destroyed on successful delete,
  with a transient-failure residual the on-access reconcile closes.
- **SC-003**: The normalize worker successfully fetches and processes a real captured object in
  **100%** of valid-media runs (the currently-broken-on-real-data path now works), preserving the
  failure contract on corrupt input.
- **SC-004**: Brand-asset rendering (logo, brand-kit image, brand footage) is **unchanged** — every
  brand surface that loaded before still loads, with **0** regressions.
- **SC-005**: The proof-detail media seam renders **0** playback elements (no `<video>`/`<img>`/
  control) — the non-playing "playback coming" seam is byte-stable.
- **SC-006**: A read of consent-bearing media is available **only** via a time-limited mediated
  reference; there are **0** code paths that surface a permanent public URL for customer media.
- **SC-007**: The application's runtime dependency count is **unchanged** (no new dependency).
- **SC-008**: The capture token model and the verification resolver show **0** changes (cores frozen);
  the `/c/[token]` page shows **0** edits.

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: N/A to layout — no proof-display surface changes. Indirectly
  reinforced: protecting the customer's footage at the file layer is the strongest possible respect
  for the person who is the headline.
- **Port, don't redesign (P-V)**: No new UI is designed. The only design-reference surface in range
  is the proof-detail media region, which is **unchanged** (the non-playing seam). No new layout is
  invented (P-XII). Cores frozen except the enumerated touch points (capture action media-persist,
  the withdrawal cascade, the worker fetch, the new mediated-read/delete capabilities).
- **Fixtures-first (P-VI)**: The change is consistent with the fixture shape — seeded fixtures store
  no media (`mediaUrl` null), so they are unaffected; the key form matches the schema's stated
  contract. Any live pre-fix rows are addressed by a one-time backfill (Assumptions).
- **Consent (P-VII) — THE central principle**: This slice makes "revocation cascades to every derived
  asset" true **at the file layer**, not just the app surface. Consent stays visible, versioned, and
  revocable; withdrawal now also removes the media object. No clip is generated from non-consented
  proof (unchanged). This is the slice's entire reason for being.
- **No editor (P-VIII)**: N/A — no studio/format surface in scope.
- **Scope (P-IX)**: A single remediation slice within T7.x. It fixes the live/broken behaviour and
  establishes the latent private-read pattern; it does **not** build T8 playback or any speculative
  feature.
- **Microcopy (P-XVII)**: Any user-facing copy (e.g. an honest "media no longer available" state)
  stays plain — no "amazing"/"awesome", no emoji.
- **Port-completeness (P-XIII)**: No dead controls. The non-playing seam stays honest; the mediated-
  read helper is real plumbing, not a decorative control; no playback control is shown before T8.
- **Owned data only (P-XIV)**: No fabricated state. `media_status` stays honest (the failure contract
  is preserved); deletion produces no fabricated success/failure.
- **Plan-not-code (P-XV)**: N/A — non-render slice (storage/consent plumbing; the normalize worker is
  media prep, not composition).
- **No-LLM-in-render (P-XVI)**: N/A — non-render slice.

## Assumptions

- **Brand vs customer split is the consent boundary**: brand-owned assets are public (no consent
  dimension); only customer proof media (captured + normalized) is consent-bearing and made private.
- **Hard-delete over tombstone** (FR-008): the recommended default is to hard-delete the media object
  on withdrawal. The consent record (versioned, including `revoked`) is the retained-for-audit
  artifact; retaining the media would itself be the exploitation P-VII guards against.
- **Backfill is minimal and grounded**: the seed sets `mediaUrl = null` for every fixture, so **no
  fixture backfill is needed**. Only proofs captured live via `/c/[token]` between T7.2 and this fix
  could hold a public URL; a one-time check + normalization (public URL → key) covers those. (The
  live count was not confirmable at spec time due to a transient DB timeout; planning should verify.)
- **The non-playing seam is the only customer-media render today**: nothing currently plays customer
  media, so establishing the mediated-read helper has no live UI consumer — the pattern is
  forward-contract plumbing for T8.
- **The existing storage-signing path is reused** for presigned reads and deletion; no new dependency.
- **The worker normalize logic is unchanged** except that it now correctly receives a key.
- **Withdrawal is the deletion trigger**: deletion is driven by the existing consent-withdrawal path;
  this slice does not introduce a separate media-management surface.

## Clarifications

### Open question (surface, do not assume) — bucket topology

This is the one decision the spec deliberately leaves open for human resolution at `/speckit-plan`.

**Context**: The storage bucket is currently **public** (brand logos rely on it via the public
domain, e.g. `media.weavova.com`). Storing a **key** instead of a URL reduces *persisted* exposure,
but in a single public bucket a constructed URL for an object remains fetchable until the object is
deleted.

**What we need to decide**:

| Option | Approach | Implications |
|--------|----------|--------------|
| **A (recommended)** | **Separate buckets** — a PUBLIC brand-assets bucket (`media.weavova.com`) + a PRIVATE customer-media bucket (mediated/presigned reads only, **no public domain**) | Cleanest: the private bucket makes "public-but-unlinked" genuinely private; withdrawal-delete is belt-and-braces, not the only protection. Cost: provision a **second R2 bucket + its credentials** in all three places (app local, Vercel, Railway worker), and route customer-media keys to it. |
| **B** | **One shared bucket** — rely on key-storage + mediated reads + delete-on-withdrawal | Less setup (no second bucket/creds). Weaker: a constructed URL for a not-yet-deleted object stays fetchable; privacy depends entirely on the delete actually running and on no public domain being mapped to the customer-media prefix. |
| **Custom** | Provide your own (e.g. one bucket but remove the public domain entirely and serve brand assets via mediated reads too) | Trade-offs depend on the variant. |

**Recommendation**: **Option A (separate buckets)** — it is the architecture that makes consent-media
*genuinely* private rather than merely unlinked, and it cleanly preserves the public brand path
unchanged. The flagged cost is provisioning a second R2 bucket and its credentials in three places.
Grounding: the current single bucket is depended on by the brand-asset/logo public path (it must stay
public) and by the still-pending T7.4 live walk (the worker reads/writes it); a private second bucket
isolates customer media without disturbing either.

**Decision**: **RESOLVED → Option A (separate buckets)** at `/speckit-plan` review. A new PRIVATE
`R2_CAPTURES_BUCKET` (no public domain, presigned-GET reads only) holds all consent-bearing customer
media; the existing PUBLIC brand-assets bucket is unchanged. This makes consent media *genuinely*
private (private by construction, not merely unlinked) and cleanly preserves the public brand path.
The flagged provisioning cost (a second R2 bucket; reuse the existing account-scoped R2 token — D7)
is accepted. Carried into plan.md (D1) and the data model.
