# Feature Specification: T7.2b — Capture Breadth (photo + audio, camera-blocked, expired link)

**Feature Branch**: `T7.2b-capture-breadth`

**Created**: 2026-07-02

**Status**: Draft

**Input**: User description: "T7.2b — Capture breadth: photo + audio capture paths, plus the polished
camera-blocked (09) and expired-link (10) surfaces. Widen the proven text+video capture spine to all
four proof types and build the two edge-state surfaces the spine stubbed. A PORT onto the existing flow."

---

## Step 0 — Design-sync check (MANDATORY, done first)

**Result: PASS for the required screens; AUDIO gap flagged.**

`design-reference/Weavova/Capture/` contains the full set as paired HTML + PNG (read-only; port
faithfully — P-V):

| Screen | Files | Role |
|---|---|---|
| 01 Prompt | `01 _ Prompt  _live _ tap Record_.{html,png}` | the four options (Record a quick video · Write it · **Add a photo** · **Record audio**) |
| 02 Recording | `02 _ Recording.{html,png}` | the on-device recording pattern (video today) |
| 03 Review | `03 _ Review.{html,png}` | the review pattern ("Use this / Retake") |
| 04 Consent | `04 _ Consent.{html,png}` | scoped consent |
| 08 Add a photo | `08 _ Add a photo.{html,png}` | the **photo review** ("Looks good? … Use this / Retake") |
| 09 Camera blocked | `09 _ Camera blocked.{html,png}` | the getUserMedia fallback |
| 10 Expired link | `10 _ Expired link.{html,png}` | the expired/used block |

**AUDIO — no dedicated screen exists.** The prompt (01) offers "Record audio", but there is **no
audio-capture or audio-review design** in the repo (screens run 01–10, none audio-specific). Per the
port-don't-invent rule (the Capture-detour lesson), this slice does **not** invent an audio design. The
recommended resolution (surfaced as the primary decision below) is to **port the shared 02/03
recording/review pattern with an audio treatment** (microphone recording, elapsed-time indicator, no
video preview, audio playback on review). This is flagged for confirmation before `/speckit.plan`.

---

## Grounding — what already exists vs what's new (verified in code)

The capture **spine is live and frozen**. Almost everything photo/audio needs already exists:

| Capability | State at spec time | This slice |
|---|---|---|
| `proof_type` enum | **Already has `photo` + `audio`** (alongside text, video) | Used as-is — **no migration** |
| `media_status` enum | captured / normalizing / normalized / failed (nullable) | Used as-is |
| Private captures bucket + KEY storage (T7.4a) | **Built** — `presignCaptureUpload` → private bucket key | Reused for photo/audio |
| Atomic send | **Built** — `submitCapture` → consume → `writeCapturedProof` (batch: proof + granted organic consent + basis) | Reused; `path` union extended |
| `media.captured` emit | **Built** — emitted from `writeCapturedProof` for **any** media proof, carries `proofType` | Fires for photo/audio automatically |
| Worker photo branch | **Built** — `normalize.ts` resizes photo (long edge ≤ 2048, re-encode JPEG) | Reused — **no worker change** |
| Worker audio branch | **Built** — `media-captured.ts` skips non-`video`/`photo` types ("non-normalizable-type") | Reused — audio skips normalize **as designed** |
| Withdrawal cascade | **Built** — hard-deletes captured media by KEY (`deleteCaptureObject`) | Covers photo/audio keys automatically |
| Consent (04), token model, text/video paths | **Built + frozen** | Reused unchanged |
| Upload fallback (camera unavailable) | **Built** — a minimal functional fallback | Screen 09 ports the polished surface over it |
| Expired/used/not-found block | **Built** — `block.tsx`, minimal honest copy | Screen 10 ports the polished surface over it |
| `presignCaptureUpload` content-type gate | **Video-only** (`isAllowedVideoType` + `EXT_BY_TYPE`) | **Extended** (additive) to accept image + audio types |

**So T7.2b is almost entirely client-flow work** (`capture-flow.tsx`) + a small send-path extension +
the two edge-surface ports. The worker, schema, emit, storage, and withdrawal cascade need **no change**.

---

## Readiness map (honest where deferred)

- **Photo — FULLY REAL.** Capture/select a photo → review (screen 08) → the **same** consent (04) →
  the **same** atomic send. Stored as a KEY in the private captures bucket, `proof_type='photo'`,
  `media.captured` emitted → the worker's **built** photo-resize branch → `normalized`.
- **Audio — REAL capture, normalization honestly deferred.** Record audio → review → consent → send.
  Stored as a KEY, `proof_type='audio'`, `media.captured` emitted. The worker **skips** audio (it is not
  a normalizable type in v1 — already built), so audio ends at `media_status='captured'` (honest:
  stored, normalization is a future worker addition). Audio capture is genuinely live; audio
  normalization is a clean, named later seam — never faked.
- **Camera-blocked (09) — REAL.** The polished fallback when the camera is unavailable/denied: "Upload
  from gallery" (file picker) + "Write it instead" (text path). Replaces the spine's minimal fallback.
- **Expired link (10) — REAL.** The polished, workspace-personalized expired/used block. Replaces the
  spine's minimal block.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A customer submits a photo (Priority: P1)

From the capture prompt, the customer taps "Add a photo", captures or picks a photo, reviews it, gives
consent, and sends it. It arrives as a real photo proof the merchant sees in their inbox.

**Why this priority**: Photo is the highest-value missing proof type — many merchants' real proof is a
product photo. It is fully buildable on the frozen spine (worker resize already exists).

**Independent Test**: Open a live capture link, choose "Add a photo", pick an image, review (Use this /
Retake), consent, send; confirm a `photo` proof with a private-bucket media key lands and renders in the
inbox/detail via the existing reads, and is resized by the worker (`normalized`).

**Acceptance Scenarios**:

1. **Given** a live capture link, **When** the customer taps "Add a photo" and selects/captures an
   image, **Then** they see the photo review (screen 08 — "Looks good? … Use this / Retake").
2. **Given** the photo review, **When** they tap "Retake", **Then** they can choose a different photo;
   **When** they tap "Use this", **Then** they proceed to the same consent step (04).
3. **Given** consent granted, **When** they send, **Then** exactly one `photo` proof is created with the
   media stored as a KEY in the private captures bucket, and the atomic send (proof + granted organic
   consent + basis) is unchanged.
4. **Given** a sent photo, **Then** `media.captured` is emitted and the worker resizes it
   (`media_status` → `normalized`); the original key is retained.
5. **Given** the photo proof, **When** the merchant opens the inbox / dashboard / proof detail, **Then**
   it renders through the existing reads with no read-layer changes (fixture-identical shape).

---

### User Story 2 — A customer submits an audio recording (Priority: P1)

From the prompt, the customer taps "Record audio", records on-device, reviews (with playback), consents,
and sends. It arrives as a real audio proof; audio normalization is honestly deferred.

**Why this priority**: Audio completes "all four proof types" and unlocks phone-call / voice testimony.
The capture is fully real; only normalization is deferred (and already skipped by the worker).

**Independent Test**: Choose "Record audio", record, review, consent, send; confirm an `audio` proof
with a private-bucket key lands, `media.captured` emits, the worker skips normalization, and
`media_status` remains an honest `captured` — the proof still renders in the inbox/detail.

**Acceptance Scenarios**:

1. **Given** a live capture link, **When** the customer taps "Record audio", **Then** they get an
   on-device audio recorder (record/stop, elapsed time; no video preview).
2. **Given** a recording, **When** they review it, **Then** they can play it back and Retake or Use this;
   Use this proceeds to the same consent step (04).
3. **Given** consent granted, **When** they send, **Then** exactly one `audio` proof is created with the
   media stored as a KEY in the private captures bucket (never the public bucket).
4. **Given** a sent audio proof, **Then** `media.captured` is emitted, the worker **skips** normalization
   (non-normalizable type), and `media_status` remains `captured` — presented honestly (not as a stuck
   "processing" state), never faked as normalized.
5. **Given** the audio proof, **When** the merchant views it, **Then** it renders through the existing
   reads (the pre-T8 non-playing media seam is preserved — no player is added here).

---

### User Story 3 — Camera-blocked fallback (screen 09) (Priority: P2)

When the customer's camera is unavailable or permission is denied, they see the polished "No camera? No
problem." surface and can upload from their gallery or write words instead — never a dead end.

**Why this priority**: A real, common failure path on mobile. The spine already handles it minimally;
this ports the designed surface (fidelity), keeping the same working behavior.

**Independent Test**: Trigger a camera-unavailable condition; confirm the screen-09 surface renders
verbatim with "Upload from gallery" (file picker → the media path) and "Write it instead" (text path),
both functional.

**Acceptance Scenarios**:

1. **Given** the camera can't be reached (unsupported or denied), **When** the recording step would
   start, **Then** the customer sees screen 09 verbatim ("No camera? No problem. We couldn't reach your
   camera. You can upload a clip from your gallery, or just write a few words instead.").
2. **Given** screen 09, **When** they tap "Upload from gallery", **Then** the file picker opens and a
   chosen file proceeds to review → consent → send (no dead control).
3. **Given** screen 09, **When** they tap "Write it instead", **Then** they proceed to the text path.

---

### User Story 4 — Expired / used / not-found link (screen 10) (Priority: P2)

A customer opening a link that has expired, been used, or is unknown sees the polished, honest block —
personalized with the sending workspace's name where that is known.

**Why this priority**: A real, common state (links are short-lived and single-use). The spine already
blocks honestly; this ports the designed surface (fidelity) without changing the security behavior.

**Independent Test**: Open an expired, a used, and an unknown link; confirm the screen-10 surface
renders verbatim, personalized with the workspace name for expired/used, generic for not-found, and
carries no dead control and no data leak.

**Acceptance Scenarios**:

1. **Given** an expired link, **When** the customer opens it, **Then** they see screen 10 verbatim
   ("This link has expired. For your security, collection links only stay open for a little while.
   {Workspace} can send you a fresh one.") with the sending workspace's name.
2. **Given** a used link, **Then** the honest used state is shown (no re-submission).
3. **Given** an unknown/not-found link, **Then** a generic honest block is shown **without** any
   workspace name (nothing to personalize; no enumeration/leak).
4. **Given** any blocked state, **Then** the "Ask {Workspace} for a new link" affordance is honest — it
   does not present a control that silently does nothing (no customer→merchant request channel exists,
   so it is honest guidance, not a fake action).

---

### Edge Cases

- **Unsupported image/audio format or oversized file.** The upload is rejected with an honest inline
  message (mirrors the existing video validation); no partial proof, token not consumed.
- **Audio recording unsupported on the device.** If microphone recording is unavailable, the customer is
  guided honestly (e.g., toward another path) — never a dead recorder.
- **Consent withdrawn on a photo/audio proof.** The existing withdrawal cascade hard-deletes the media by
  key — photo/audio are covered automatically (P-VII reaches the file).
- **Camera-blocked leading to an upload.** An uploaded photo/video from screen 09 flows through the same
  review → consent → send as a captured one.
- **Photo showing a face.** The consent step's face-display control applies to photo (a photo may show a
  face), consistent with video; audio (no face) omits it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The prompt's "Add a photo" option MUST become a live path: capture or select a photo →
  photo review (screen 08) → the existing consent step → the existing atomic send.
- **FR-002**: A photo proof MUST be created with `proof_type='photo'` and its media stored as a KEY in
  the private captures bucket (never the public bucket), reusing the existing presigned-upload path.
- **FR-003**: The prompt's "Record audio" option MUST become a live path: on-device audio recording →
  review (with playback) → the existing consent step → the existing atomic send.
- **FR-004**: An audio proof MUST be created with `proof_type='audio'` and its media stored as a KEY in
  the private captures bucket.
- **FR-005**: Sending a photo or audio proof MUST emit `media.captured` (reusing the existing emit);
  photo MUST be normalized by the existing worker branch, and audio MUST be skipped by the worker and
  left at an honest `media_status` (`captured`) — never presented as normalized or as perpetually
  "processing".
- **FR-006**: The atomic send, token model, consent flow, text/video paths, and the T7.4a
  storage/routing MUST remain unchanged; photo/audio MUST reuse these primitives. The send-path input
  MUST accept the photo and audio paths additively.
- **FR-007**: The upload content-type acceptance MUST be extended (additively) to allow image and audio
  types alongside video, with honest validation for unsupported/oversized media.
- **FR-008**: Photo and audio proofs MUST render through the **existing** inbox, dashboard, and
  proof-detail reads with no read-layer edits (the zero-read-edit property); their fixture shape matches
  the existing media-proof shape.
- **FR-009**: The consent step's face-display control MUST apply to the photo path (a photo may show a
  face), consistent with the video path; it MUST NOT apply to the audio path (no face).
- **FR-010**: The camera-blocked state MUST render the polished screen-09 surface verbatim, with a
  working "Upload from gallery" (media path) and "Write it instead" (text path) — no dead controls.
- **FR-011**: The expired/used/not-found state MUST render the polished screen-10 surface verbatim,
  personalized with the sending workspace's name for expired/used and generic (no workspace name) for
  not-found, with no dead control and no data leak.
- **FR-012**: All new surfaces MUST be mobile-first, on the Pressroom tokens (light + dark), with copy
  lifted verbatim from the binding designs, and MUST use the affirmative consent checkbox already adopted
  in the capture flow for photo/audio too.
- **FR-013**: The consent-withdrawal cascade MUST reach photo/audio media (hard-delete by key) — verified
  as covered by the existing cascade, no new deletion logic.
- **FR-014**: No new runtime dependency MUST be introduced (audio recording and image selection use
  browser APIs); no schema migration is required (the proof-type values already exist).

### Key Entities *(include if data involved)*

- **Proof**: gains real `photo` and `audio` instances (the enum values already exist). A photo/audio
  proof carries its media as a private-bucket KEY and a `media_status` lifecycle (photo → normalized;
  audio → captured).
- **Consent**: unchanged — the same scoped, granted-organic consent is written atomically for photo/audio
  as for video/text; the face-display control applies to photo.
- **Capture request / token**: unchanged — the same single-use, expiring token gates all four paths.
- **Workspace**: its name personalizes the expired/used block (screen 10).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A customer can submit all four proof types (text, video, photo, audio) from the capture
  link, each landing as a real proof the merchant sees — no "coming" placeholders remain in the prompt.
- **SC-002**: 100% of photo submissions are stored as a private-bucket key, normalized by the worker, and
  render in the merchant's existing inbox/detail with zero read-layer changes.
- **SC-003**: 100% of audio submissions are stored as a private-bucket key with an honest `captured`
  status (no faked normalization), and render in the existing inbox/detail.
- **SC-004**: The camera-blocked and expired surfaces match their binding designs (verbatim copy,
  layout, light + dark) and contain zero dead controls.
- **SC-005**: Consent withdrawal on a photo/audio proof removes the underlying media file (verified by
  the existing cascade), same as video.
- **SC-006**: The change introduces no new dependency and no schema migration; the atomic send, token,
  consent, storage, and worker cores are unchanged.

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: photo/audio ARE the customer's real proof — the capture surfaces
  keep the customer's own media/words central; the merchant chrome stays out of the capture page.
- **Port, don't redesign (P-V)**: screens 08/09/10 are ported verbatim from the named
  `design-reference/Weavova/Capture/` files; audio reuses the 02/03 recording/review pattern (no invented
  audio design — flagged). Built on the frozen spine. **Layout-faithful first pass** (a fidelity sweep is
  pushed into this slice, given the repeated need). Divergences are recorded decisions (P-XII).
- **Fixtures-first (P-VI)**: photo/audio proofs match the existing media-proof fixture shape and flow
  through the existing reads unchanged.
- **Consent (P-VII)**: photo/audio use the **same** real scoped consent (04), the same private T7.4a
  storage, and the same withdrawal-reaches-the-file cascade; the face-display control applies where a
  face may appear (photo).
- **No editor (P-VIII)**: photo review and audio review are record/select → review (Use this / Retake) —
  no timeline/track/scrubber; consistent with the no-editor capture model.
- **Scope (P-IX)**: one slice — the deferred remainder of T7.2 (photo + audio + screens 09/10). No new
  proof types beyond the four; no playback (T8); no audio normalization (a later worker addition).
- **Microcopy (P-XVII)**: copy is verbatim from the designs; no "amazing"/emoji added.
- **Port-completeness (P-XIII)**: no dead controls — the "coming" photo/audio options become live; screen
  09/10 controls are real; audio-not-normalized is honest, not faked; the "Ask {Workspace}" affordance is
  honest guidance, not a fake action.
- **Owned data only (P-XIV)**: only real captured media with an honest `media_status`; no fabricated
  capture or status.
- **Plan-not-code (P-XV)** / **No-LLM-in-render (P-XVI)**: N/A — the worker normalize is media prep built
  in T7.4, not composition, and no render engine is in scope.

## Assumptions

- **The spine is frozen (P-V).** The atomic send (`submitCapture` / `writeCapturedProof`), the token
  model, consent, the video/text paths, the T7.4a private-bucket storage/routing, the worker, and the
  `media.captured` emit are unchanged. Photo/audio reuse them. If correctness appears to need a
  frozen-core change, work stops and surfaces the conflict.
- **No migration, no new dependency.** `proof_type` already includes `photo`/`audio`; audio recording and
  image selection are browser APIs. Dependency count stays 11.
- **Enumerated touch points**: the capture client flow (`capture-flow.tsx` — add photo + audio flows,
  screen 09 fallback, remove the photo/audio "coming" state, extend face-display to photo); the send-path
  input/branch (`submitCapture`) additively; the upload content-type allowlist/ext map (additive) so
  `presignCaptureUpload` accepts image + audio; and the expired/used block surface (`block.tsx`, screen
  10). Nothing else.

### Recommended defaults for the open questions (flag to change before `/speckit.plan`)

- **Audio design (the key decision)** → **Port the shared 02/03 recording/review pattern with an audio
  treatment** (mic record, elapsed-time indicator, no video preview, audio playback on review). No
  bespoke audio design is invented. *(This is the one genuine open decision — confirm or redirect.)*
- **proof-type values** → **already in the enum** (`photo`, `audio`) — no migration. Resolved by grounding.
- **Audio-not-normalized honesty** → audio ends at **`media_status='captured'`** (accurate: stored,
  normalization deferred); confirmed the worker already skips it. The presentation must show `captured`
  audio honestly (the pre-T8 non-playing seam already shows media as a labelled placeholder, not a
  processing spinner) — verified in plan.
- **Photo showFace consent** → **yes, the face-display control applies to photo** (a photo may show a
  face), same as video; audio omits it.
- **Expired-link personalization (surfaced from the design)** → screen 10 shows the **workspace name**
  for expired/used (the token legitimately maps to that workspace — the customer received the link from
  them) and stays **generic for not-found** (no workspace to name; no leak).
- **"Ask {Workspace} for a new link" action** → **honest guidance, not a functional/dead button** (no
  customer→merchant request channel exists yet); port the design's framing without a control that does
  nothing.

### Out of scope

- Media **playback** on a stored proof (the T8 non-playing seam is preserved).
- **Audio normalization** in the worker (a later, additive worker branch — this slice leaves the honest
  seam).
- Any change to the send/token/consent/storage/worker cores, or a new proof type beyond the four.
