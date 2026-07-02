---

description: "Task list for T7.2b — Capture Breadth (photo + audio, camera-blocked, expired link)"
---

# Tasks: T7.2b — Capture Breadth

**Input**: Design documents from `specs/T7.2b-capture-breadth/`
**Prerequisites**: plan.md, spec.md, research.md (D1–D7), data-model.md,
contracts/{capture-paths,edge-surfaces}.md, quickstart.md
**Binding designs**: `design-reference/Weavova/Capture/` — `08 _ Add a photo`, `09 _ Camera blocked`,
`10 _ Expired link`; audio adapts `02 _ Recording` / `03 _ Review` (read-only; port faithfully — P-V)

**Tests**: No automated suite is wired; verification is `npm run build` + the `quickstart.md` A–D matrix.
Data-shape/integration are **headless-checkable**; the capture UX (camera/mic) needs a **real device
walk** (Cornel) — noted per task.

**Constitution tags**: P-V (spine frozen, port from binding refs), P-VII (same consent + private T7.4a
storage + withdrawal), P-XIII (photo/audio live not "coming", honest 09/10, no dead "Ask", audio
honest-complete), P-XIV (real media, honest status). **P-XV/XVI: N/A — non-render slice.**

**Spine FROZEN (P-V)**: the atomic send/consume core (`submitCapture` consume + `writeCapturedProof`
batch), the token model, the consent write, the video/text paths, T7.4a storage/routing, the worker
(`normalize.ts`/`media-captured.ts` — photo resize + audio skip built), the `media.captured` emit, the
withdrawal cascade, and `ProofView`/its queries (no `media_status` surfaced) are **reused unchanged**.
**STOP-and-surface if a core needs a real change.**

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different file / independent — safe to parallelize
- **[Story]**: US1 photo · US2 audio · US3 camera-blocked · US4 expired (Setup/Foundational/Polish: none)

---

## Phase 1: Setup

- [X] T001 [P] Record baseline anchors (read-only): `package.json` dependency count (expected **11**);
      note that `proof_type` already has `photo`/`audio` (no migration) and the worker handles
      photo-resize + audio-skip (no worker change). For gates T-cores/T-dep.
      **DoD**: values noted; no files changed. **(P-V)**

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: The additive upload allowlist every media path depends on. **⚠️ Photo/audio flows can't
land until this is done.**

- [X] T002 Extend the capture content-type allowlist in `src/lib/capture.ts` (additive): add
      `CAPTURE_ALLOWED_IMAGE_TYPES` (`image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif`)
      and `CAPTURE_ALLOWED_AUDIO_TYPES` (`audio/webm`, `audio/mp4`, `audio/mpeg`) + a `CaptureMediaType`
      union; move `photo`/`audio` from `CAPTURE_COMING_PATHS` to `CAPTURE_WIRED_PATHS`.
      **DoD**: all four paths wired; image+audio types exported; video set unchanged. **(P-V)**
- [X] T003 In `src/app/c/[token]/actions.ts`, generalize `EXT_BY_TYPE` (add image/audio extensions) and
      replace `isAllowedVideoType` with `isAllowedCaptureType` (video ∪ image ∪ audio); `presignCaptureUpload`
      validates the broadened set. It MUST still route to the **private captures bucket** via
      `presignCaptureUploadToR2` + `captureMediaKey` (KEY storage, T7.4a) — no change to storage/routing.
      (Depends on T002.)
      **DoD (by construction)**: image/audio uploads presign to a private-bucket KEY; unsupported/oversized
      still rejected honestly; the public bucket is never addressable here. **(P-V, P-VII)**
- [X] T004 In `src/app/c/[token]/actions.ts`, extend `submitCapture`'s `path` union to
      `"text" | "video" | "photo" | "audio"` and add the `photo`/`audio` branches (`proofType='photo'`/
      `'audio'`, `mediaUrl=mediaKey`). The consume + `db.batch` send core is UNCHANGED (media-agnostic).
      (Depends on T003.)
      **DoD (by construction)**: photo/audio reuse the atomic send; no partial proof; token single-use
      preserved. **(P-V, P-VII)**

**Checkpoint**: uploads accept image/audio to private KEY storage; the send path accepts photo/audio.

---

## Phase 3: User Story 1 — Submit a photo (Priority: P1) 🎯 MVP

**Goal**: The prompt's "Add a photo" becomes a live path — pick/capture → review (08) → consent → send;
a real `photo` proof lands and the worker resizes it.

**Independent Test**: quickstart **A** — pick a photo, review, consent (face-display shown), send;
assert a `photo` proof with a private-bucket KEY + granted consent; worker → `normalized`. (Needs a
real device/browser for the picker; data shape headless-checkable.)

- [X] T005 [US1] In `src/app/c/[token]/capture-flow.tsx`, wire the **photo** path — port
      `design-reference/Weavova/Capture/08 _ Add a photo`: `choosePath("photo")` → a file input
      `accept="image/*"` (OS camera/gallery) → hold the file → **review** ("Looks good? Not sent yet — you
      can retake." · **Use this** / **Retake**). Use this → the existing presign→PUT→`submitCapture({
      path:"photo", mediaKey })`. Verbatim copy, mobile-first, light + dark.
      **DoD**: photo review renders per screen 08; Retake re-picks; Use this sends a `photo` proof.
      **(P-V, P-XIV)**
- [X] T006 [US1] In `capture-flow.tsx`, extend the consent step's **face-display** control to the `photo`
      path (currently gated `path === "video"`), keeping the affirmative checkbox; audio will omit it.
      (Same file as T005 → sequential.)
      **DoD**: a photo submission shows the face-display consent control (a photo may show a face), like
      video. **(P-VII)**
- [X] T007 [US1] In `capture-flow.tsx`, remove the "Add a photo" **coming** routing (the prompt option now
      routes to the live photo path). (Same file → sequential.)
      **DoD**: the prompt's "Add a photo" is a live control, not a "coming" state. **(P-XIII)**

**Checkpoint**: photo capture is end-to-end live and stored privately; the worker normalizes it.

---

## Phase 4: User Story 2 — Submit an audio recording (Priority: P1)

**Goal**: The prompt's "Record audio" becomes live — record (mic, timer) → review with playback →
consent → send; a real `audio` proof lands, honest-complete at `captured`.

**Independent Test**: quickstart **B** — record, review (playback), consent (no face-display), send;
assert an `audio` proof with a private KEY; worker skips → `media_status='captured'`. (Needs a real
device/mic; data shape headless-checkable.)

- [X] T008 [US2] In `src/app/c/[token]/capture-flow.tsx`, wire the **audio** path — a documented
      adaptation of `02 _ Recording` / `03 _ Review` (research D1): `choosePath("audio")` → MediaRecorder
      **audio** (mic) with a running **timer**, **no video preview**; stop → **review** with **audio
      playback** (Retake / Use this) → the existing presign→PUT→`submitCapture({ path:"audio", mediaKey })`.
      Mobile-first, light + dark; audio treatment on-token.
      **DoD**: audio records + plays back + sends an `audio` proof; no video preview; no bespoke design
      invented. **(P-V, P-XIV)**
- [X] T009 [US2] In `capture-flow.tsx`, confirm the consent step **omits** face-display for the `audio`
      path (no face), keeping the affirmative checkbox, and remove the "Record audio" **coming** routing
      (now live). (Same file → sequential with T008.)
      **DoD**: audio consent has no face-display; the prompt's "Record audio" is a live control. **(P-VII,
      P-XIII)**
- [X] T010 [US2] Confirm audio honesty (by construction, read-only): the worker skips audio
      (`media-captured.ts` non-`video`/`photo`), so `media_status` stays `captured`; no merchant surface
      reads `media_status` (`ProofView`/`ProofDetailView` omit it) → audio renders as **complete**, never
      pending. No code change beyond the T-badge fix (T014).
      **DoD**: an audio proof at `captured` is indistinguishable from a normalized proof in the merchant
      reads. **(P-XIII, P-XIV)**

**Checkpoint**: audio capture is live; audio is honestly complete at `captured`.

---

## Phase 5: User Story 3 — Camera-blocked fallback (Priority: P2)

**Goal**: Port the polished screen-09 surface over the spine's existing upload fallback — never a dead
end.

**Independent Test**: quickstart **C** — deny camera; screen 09 renders verbatim; Upload from gallery
(file → review → send) and Write it instead (text) both work. (Needs a real device to deny camera.)

- [X] T011 [US3] In `src/app/c/[token]/capture-flow.tsx`, port `design-reference/Weavova/Capture/09 _
      Camera blocked` over the existing camera-unavailable/upload fallback: verbatim ("No camera? No
      problem. We couldn’t reach your camera. You can upload a clip from your gallery, or just write a few
      words instead.") with **Upload from gallery** (→ the media file path) and **Write it instead** (→ the
      text path). Mobile-first, light + dark. Same functional behavior, polished UI.
      **DoD**: screen 09 renders per the design; both actions are real (no dead control). **(P-V, P-XIII)**

**Checkpoint**: the camera-blocked path is polished and never dead-ends.

---

## Phase 6: User Story 4 — Expired / used / not-found (Priority: P2)

**Goal**: Port the polished screen-10 block — personalized with the workspace name for expired/used,
generic for not-found, with honest "Ask {Workspace}" guidance (not a button).

**Independent Test**: quickstart **D** — open expired / used / unknown links; screen 10 renders verbatim,
personalized for expired/used, generic for not-found, no dead control. (Headless-checkable via the
resolver + a direct render.)

- [X] T012 [US4] Make the workspace name available to the block (additive, no core change): in
      `src/db/queries.ts` `getCaptureRequestByToken`, return `workspaceName` on the `used`/`expired`
      branches (the join already selects `workspace.name`); `not_found` stays bare. Widen
      `CaptureResolution` (`src/lib/capture.ts`) so `used`/`expired` carry `workspaceName: string`. Pass it
      from `src/app/c/[token]/page.tsx` into `CaptureBlock`.
      **DoD**: expired/used resolutions carry the workspace name; not-found carries none; token model +
      single-use/expiry unchanged. **(P-V)**
- [X] T013 [US4] Port `design-reference/Weavova/Capture/10 _ Expired link` over
      `src/app/c/[token]/block.tsx`: verbatim, personalized for **expired/used** ("{Workspace} can send you
      a fresh one." + "Ask {Workspace} for a new link"), **generic** for not-found (no name). The "Ask
      {Workspace} for a new link" affordance is **honest guidance TEXT, not a button** (no customer→merchant
      channel — P-XIII). Mobile-first, light + dark. (Depends on T012.)
      **DoD**: screen 10 renders per the design; expired/used personalized, not-found generic; no dead
      control; no workspace leak on an unknown token. **(P-V, P-XIII)**

**Checkpoint**: the blocked-link states are polished, personalized, and honest.

---

## Phase 7: Integration & Drift Fix

- [X] T014 [P] Fix the D7 drift in `src/components/app/proof-detail/proof-detail-media.tsx`: the
      bottom-right badge hard-codes "video stored" — generalize it to the real `proof_type`
      ("photo stored" / "audio stored" / "video stored", "playback coming"), so a photo/audio proof is not
      mislabelled. Presentation-copy only (no read/query change).
      **DoD**: the non-playing seam badge reflects the actual proof type. **(P-XIV)**
- [X] T015 [P] Confirm the **zero read-edit** integration (read-only): photo/audio proofs render through
      the existing inbox (`proof-card.tsx` — already `customer {proofType}`), dashboard, and proof detail
      (`proof-detail-meta.tsx` already labels photo/audio; `proof-detail-media.tsx` renders for any
      non-text) with no query/type change; `media.captured` routes photo→resize, audio→skip; the key-based
      withdrawal cascade covers photo/audio media.
      **DoD**: no read-layer change beyond T014; photo/audio flow through existing reads; withdrawal reaches
      photo/audio files. **(P-V, P-VII)**

---

## Phase 8: Polish, Gates & Definition of Done

- [X] T016 [P] **Cores-frozen gate (P-V)**: confirm the change set touches only `src/lib/capture.ts`,
      `src/app/c/[token]/{actions.ts,capture-flow.tsx,block.tsx,page.tsx}`, `src/db/queries.ts`
      (`getCaptureRequestByToken` return only), and `proof-detail-media.tsx`. The atomic send/consume,
      token model, consent write, video/text paths, T7.4a storage/routing, the worker, the emit, and the
      withdrawal cascade are **unchanged**.
      **DoD**: no frozen core modified; else STOP-and-surface.
- [X] T017 [P] **No-new-dep gate (P-III)**: `package.json` dependency count unchanged (**11**); audio/photo
      use browser APIs only.
      **DoD**: count identical to T001.
- [X] T018 [P] **No-migration gate**: no new file in `drizzle/`; `proof_type`/`media_status` schema
      unchanged.
      **DoD**: zero schema/migration diff.
- [X] T019 [P] **No-fabricated-output audit (P-XIV/P-XIII)**: audio is honest-complete at `captured` (no
      faked normalized); the detail badge is type-correct (T014); the "Ask {Workspace}" affordance is
      guidance text, not a dead/fake button; no captured media is fabricated.
      **DoD**: no fabricated status/output; no dead control.
- [X] T020 **Port-fidelity sweep (P-V/P-IV)** — LAYOUT-FAITHFUL first pass: compare screens 08, 09, 10 (and
      the audio treatment vs 02/03) against their binding designs — verbatim copy, layout, mobile-first,
      light + dark, persimmon only on the primary action. Produce a match/divergence/drift-fixed note per
      surface; fix clear drift now.
      **DoD**: each surface matches its binding design or its divergence is a recorded decision.
- [X] T021 **Run the quickstart matrix** (`quickstart.md` A–D): A photo, B audio, C camera-blocked, D
      expired/used/not-found. Note **real-device** scenarios (A/B picker+mic, C deny-camera) vs
      **headless** (data-shape asserts for A/B; resolver + block render for D).
      **DoD**: every scenario passes (device-gated ones noted for the live walk).
- [X] T022 **`npm run lint` and `npm run build` green** (TS strict; no `any`/unjustified `@ts-ignore`).
      **DoD**: both exit 0.

**P-XV / P-XVI**: N/A — non-render slice.

**Definition of done**: all four proof types capture end-to-end (photo normalized; audio honest-complete
at `captured`); screens 09/10 ported (verbatim, personalized, honest); the badge mislabel fixed; cores
frozen + no new dep + no migration + no fabricated output; quickstart passes; build green. Then **STOP
and report** (P-IX).

---

## Dependencies & Execution Order

- **Setup (T001)** → no deps.
- **Foundational (T002 → T003 → T004)** → the allowlist + send-path; blocks US1/US2 (they upload/send).
- **US1 photo (T005 → T006 → T007)** and **US2 audio (T008 → T009 → T010)** → after Foundational.
  Both edit `capture-flow.tsx` (same file) → their tasks are **sequential within the file**; US1 and US2
  are logically independent but share the file, so land US1 then US2 (or interleave carefully).
- **US3 (T011)** and **US4 (T012 → T013)** → US3 edits `capture-flow.tsx` (after US1/US2 land in that
  file); US4 edits queries/capture.ts/page/block (**independent of `capture-flow.tsx`** → [P] with US3).
- **Integration (T014 [P], T015 [P])** → T014 independent file; T015 read-only confirm.
- **Gates (T016–T022)** → after all stories; T022 is the final green gate.

### Parallel opportunities

- T014 [P] (proof-detail-media) alongside any capture-flow work (different file).
- US4 (T012/T013 — queries/block/page) [P] with US3 (T011 — capture-flow), different files.
- T016 [P] + T017 [P] + T018 [P] + T019 [P] (independent audits).

**File-contention note**: T005–T011 all edit `src/app/c/[token]/capture-flow.tsx` → **sequential**, not
[P], despite spanning US1/US2/US3.

---

## Implementation Strategy

### MVP (US1 + US2 — both P1)

1. Setup + Foundational (T001–T004).
2. US1 photo (T005–T007) → US2 audio (T008–T010) → the four proof types are all live.
3. Validate quickstart A + B.

### Incremental

1. MVP (photo + audio) → validate.
2. US3 camera-blocked (T011) → validate C.
3. US4 expired (T012–T013) → validate D.
4. Integration (T014–T015) + gates (T016–T022) → build green → STOP and report.

---

## Notes

- The atomic send, token, consent, storage, worker, emit, and reads are **reused unchanged** — this slice
  is the client flow + the additive allowlist + the two edge ports + one honest-copy badge fix.
- Audio is **honest-complete at `captured`** because no surface reads `media_status` (verified) — do not
  add a status to force a "ready" look (that would be dishonest).
- If correctness appears to need a frozen-core change (send/token/consent/T7.4a/worker), **stop and
  surface** (P-V).
