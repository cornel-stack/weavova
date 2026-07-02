# Implementation Plan: T7.2b — Capture Breadth (photo + audio, camera-blocked, expired link)

**Branch**: `T7.2b-capture-breadth` | **Date**: 2026-07-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T7.2b-capture-breadth/spec.md`

## Summary

Widen the proven text+video capture spine to all four proof types and port the two edge surfaces the
spine stubbed. Grounding shrank the slice: `proof_type` already has `photo`/`audio` (no migration), the
worker photo-resize + audio-skip are built (no worker change), `media.captured` emits generically, and
the withdrawal cascade deletes by key. So this is **client-flow work** (`capture-flow.tsx`) + an
**additive upload content-type allowlist** + the **screen 09/10 ports** + one **honest-copy fix**.

- **Photo** → OS camera/file picker → review (screen 08) → the **same** consent (04, with face-display)
  → the **same** atomic send; `proof_type='photo'`, private-bucket KEY, worker resizes.
- **Audio** → MediaRecorder mic recording (timer, no video preview) → review with audio playback →
  consent → send; `proof_type='audio'`, private-bucket KEY. The worker **skips** audio (built), so it
  ends at `media_status='captured'` — honest and **complete** (no surface reads media_status, so it's
  indistinguishable from a normalized proof).
- **Screen 09** (camera-blocked) → port the polished surface over the existing upload fallback.
- **Screen 10** (expired/used/not-found) → port the polished block; personalize with the workspace name
  for expired/used (the resolver already fetches it), generic for not-found; "Ask {Workspace}" is honest
  guidance text, not a fake button.

The spine cores (atomic send, token model, consent, video/text paths, T7.4a storage, worker, emit) are
**frozen and reused**. No migration, no new dependency.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 15 App Router, React 19

**Primary Dependencies**: browser MediaRecorder (audio) + file input (image) — **no new dependency**;
Drizzle/Neon (reads only), R2 private captures bucket (T7.4a), Inngest emit (existing). 11 deps.

**Storage**: No schema change. Photo/audio media = a KEY in the **private** captures bucket (T7.4a),
via the existing presigned PUT. `proof_type` (`photo`/`audio`) and `media_status` enums already exist.

**Testing**: `npm run build` + `npm run lint`; manual per `quickstart.md` (photo, audio, camera-blocked,
expired/used/not-found on a real capture link) — capture is browser-driven (Cornel's device walk);
data-shape assertions are headless-checkable.

**Target Platform**: The public `/c/[token]` phone surface (mobile-first), outside the app chrome.

**Project Type**: Web application (single Next.js project; `src/`).

**Performance Goals**: N/A beyond a responsive mobile capture; media bytes PUT direct to R2 (never
through the app server), as today.

**Constraints**: Spine frozen (P-V). Bytes never transit the app server. Verbatim design copy (P-XVII).
Persimmon only on the primary capture action (P-IV). No playback (T8 seam preserved).

**Scale/Scope**: The `/c/[token]` client flow + the send-path validation/branch + two edge-surface
ports + one honest-copy badge fix. No worker, schema, or read-query change.

### Enumerated touch points (nothing else changes)

| File | Change | Kind |
|---|---|---|
| `src/lib/capture.ts` | All four paths → `CAPTURE_WIRED_PATHS`; add `CAPTURE_ALLOWED_IMAGE_TYPES` + `CAPTURE_ALLOWED_AUDIO_TYPES` (+ a `CaptureMediaType` union); `CaptureResolution` used/expired gain optional `workspaceName` | additive |
| `src/app/c/[token]/actions.ts` | `EXT_BY_TYPE` + `isAllowedVideoType` → `isAllowedCaptureType` (video+image+audio); `presignCaptureUpload` validates the broadened set (still private bucket, KEY); `submitCapture` `path` union + `photo`/`audio` branches | additive |
| `src/app/c/[token]/capture-flow.tsx` | Photo flow (picker/camera → review 08 → consent → send); audio flow (MediaRecorder audio → review w/ playback → consent → send); drop the photo/audio "coming" view (→ live); screen-09 fallback port; extend the face-display control to `photo` | the bulk |
| `src/app/c/[token]/block.tsx` | Port screen 10 (name-personalized expired/used, generic not-found, honest "Ask {Workspace}" guidance) | port |
| `src/app/c/[token]/page.tsx` | Pass `workspaceName` (from the resolution) to `CaptureBlock` | additive prop |
| `src/db/queries.ts` (`getCaptureRequestByToken`) | Return `workspaceName` on the `used`/`expired` branches (the join already fetches `workspace.name`) | additive |
| `src/components/app/proof-detail/proof-detail-media.tsx` | Generalize the hard-coded "video stored" badge to the real `proof_type` ("photo/audio/video stored · playback coming") | honest-copy fix |

**Frozen — do NOT touch**: the atomic send/consume core (`submitCapture` consume + `writeCapturedProof`
batch), the token model, the consent write, the video/text paths, T7.4a storage/routing
(`presignCaptureUploadToR2`, `captureMediaKey`, the private/public split), the worker
(`normalize.ts` / `media-captured.ts` — photo resize + audio skip already built), the `media.captured`
emit, `ProofView`/`ProofDetailView` + their queries (no `media_status` surfaced), the withdrawal
cascade, `proof-card.tsx` (already `proof_type`-generic). STOP-and-surface if a core needs a real change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Customer is the headline (P-II)**: photo/audio ARE the customer's real proof; the capture page
      keeps their media/words central, chrome-free.
- [x] **Locked stack (P-III)**: browser MediaRecorder + file input; **no new dependency**; heavy media
      work stays in the T7.4 worker (unchanged).
- [x] **Pressroom tokens (P-IV)**: 08/09/10 ported on-token, light + dark; persimmon only on the primary
      capture action.
- [x] **Port, don't redesign (P-V)**: 08/09/10 ported verbatim from the named
      `design-reference/Weavova/Capture/` files; audio reuses the 02/03 pattern (documented adaptation,
      **not** an invented design — research D1); the spine is frozen and reused. **Layout-faithful first
      pass** (fidelity pushed into this slice).
- [x] **Fixtures-first (P-VI)**: photo/audio match the existing media-proof shape and flow through the
      existing reads (one honest-copy badge fix aside).
- [x] **Consent enforcement (P-VII)**: photo/audio use the same scoped consent (04), the same private
      T7.4a KEY storage, and the same withdrawal-reaches-the-file cascade; face-display applies to photo.
- [x] **No editor (P-VIII)**: photo/audio are select/record → review (Use this / Retake) — no
      timeline/scrubber.
- [x] **SDD scope (P-IX)**: the deferred remainder of T7.2 only; no fifth proof type, no playback (T8),
      no audio normalization (a later worker seam).
- [x] **Ambiguity handling (P-XII)**: the audio design gap is resolved by reusing the 02/03 pattern (not
      invented); the screen-10 personalization + "Ask" affordance are recorded decisions.
- [x] **Port-completeness (P-XIII)**: the "coming" photo/audio options go live; 09/10 controls are real;
      audio-not-normalized is honest (complete at `captured`, not faked); "Ask {Workspace}" is honest
      guidance, not a dead button.
- [x] **Owned data only (P-XIV)**: real captured media, honest status; the badge fix removes a
      video-specific mislabel on photo/audio.
- [x] **Plan-not-code (P-XV)** / **No-LLM-in-render (P-XVI)**: N/A — non-render slice (worker normalize is
      media prep, built in T7.4).

**Definition of done (P-Governance)**: real capture on a real link; empty/loading/error (unsupported
media, camera-blocked, expired) honest; responsive mobile-first at the breakpoints; on-token light+dark;
keyboard/there-accessible; acceptance criteria met; build green.

**Result**: PASS (no violations; Complexity Tracking empty).

## Project Structure

### Documentation (this feature)

```text
specs/T7.2b-capture-breadth/
├── plan.md
├── research.md          # D1 audio pattern · D2 allowlist · D3 audio-status honesty · D4 screen-10 name · D5 "Ask" affordance · D6 showFace · D7 badge fix
├── data-model.md        # no schema change; the media-proof shape for photo/audio + status lifecycle
├── quickstart.md        # photo / audio / camera-blocked / expired-used-notfound scenarios
├── contracts/
│   ├── capture-paths.md          # photo + audio flow + the send-path/allowlist contract
│   └── edge-surfaces.md          # screen 09 + screen 10 port contract (verbatim copy, personalization)
└── tasks.md             # Phase 2 (/speckit-tasks — NOT here)
```

### Source Code (repository root)

```text
src/app/c/[token]/
├── capture-flow.tsx     # + photo flow, + audio flow, + screen-09 fallback, − coming view, showFace→photo
├── actions.ts           # + isAllowedCaptureType, + submitCapture photo/audio branches
├── block.tsx            # screen-10 port (name-personalized + honest guidance)
└── page.tsx             # pass workspaceName to the block
src/lib/capture.ts       # wired paths + image/audio allowlists + CaptureResolution.workspaceName
src/db/queries.ts        # getCaptureRequestByToken returns workspaceName on used/expired
src/components/app/proof-detail/proof-detail-media.tsx   # generalize the "video stored" badge
```

**Structure Decision**: All change is concentrated in the existing `/c/[token]` capture surface + its
two libs, plus one honest-copy fix in the merchant proof-detail. No new modules.

## The things this plan resolves

### 1. capture-flow.tsx — the photo + audio flows (reusing the send/consent primitives)

- **Photo**: `choosePath("photo")` → a file input `accept="image/*"` with the `capture` hint (OS camera
  or gallery) → on select, hold the file + show the **screen-08 review** ("Looks good? … Use this /
  Retake") → "Use this" runs the **existing** presign→PUT→`submitCapture` path with `path:"photo"`. The
  consent step (04) shows the **face-display** control (a photo may show a face), exactly like video.
- **Audio**: `choosePath("audio")` → a MediaRecorder **audio** recorder (mic; a running **timer**, no
  video preview) → stop → **review** (reuse the 02/03 pattern: play the recorded blob, Retake / Use this)
  → the existing presign→PUT→`submitCapture` path with `path:"audio"`. Consent (04) **omits** face-display
  (no face). Research D1 (audio = the 02/03 pattern with an audio treatment, not a bespoke design).
- The prompt's photo/audio options move from the "coming" view to live paths; the `coming` screen is
  removed (all four wired). The atomic send + consume core is untouched — only the client `path` +
  `submitCapture`'s branch widen.

### 2. The additive upload content-type allowlist (private bucket, KEY — unchanged)

- `src/lib/capture.ts`: add `CAPTURE_ALLOWED_IMAGE_TYPES` (`image/jpeg`, `image/png`, `image/webp`, and
  `image/heic`/`heif` for iOS — the worker re-encodes to JPEG) and `CAPTURE_ALLOWED_AUDIO_TYPES`
  (`audio/webm`, `audio/mp4`, `audio/mpeg` — MediaRecorder outputs) alongside the video set; a
  `CaptureMediaType` union. `EXT_BY_TYPE` gains the matching extensions.
- `actions.ts`: `isAllowedVideoType` → `isAllowedCaptureType` (accepts any allowed video/image/audio
  type). `presignCaptureUpload` validates the broadened set and still routes to the **private captures
  bucket** via `presignCaptureUploadToR2` + `captureMediaKey` (KEY storage, T7.4a) — unchanged. Research
  D2.

### 3. Screen 09 (camera-blocked) — port over the existing fallback

- Replace the spine's minimal fallback with the verbatim screen-09 surface ("No camera? No problem. We
  couldn't reach your camera. You can upload a clip from your gallery, or just write a few words
  instead." + **Upload from gallery** → the media file path + **Write it instead** → the text path).
  Same functional behavior, polished UI, mobile-first, light+dark. Binding ref: `09 _ Camera blocked`.

### 4. Screen 10 (expired/used/not-found) — port with name personalization + honest guidance

- Port the verbatim screen-10 block. **Personalization**: the resolver already selects
  `workspace.name`; add it to the `used`/`expired` resolutions (additive) and pass it through `page.tsx`
  to `CaptureBlock`. Expired/used show "{Workspace} can send you a fresh one." + "Ask {Workspace} for a
  new link"; **not-found stays generic** (no row → no workspace → no name; no enumeration/leak).
- **Security note (research D4)**: showing the name on expired/used is not a leak — the token genuinely
  maps to that workspace and the holder received the link from them. Not-found reveals nothing.
- **"Ask {Workspace} for a new link" = honest guidance text, not a button** (research D5): no
  customer→merchant request channel exists, so a functional-looking button would be a dead control
  (P-XIII). Port the design's framing as non-interactive guidance.

### 5. Integration — fixture-identical render + the audio-status honesty check

- **Zero read-layer edits** (confirmed): `ProofView`/`ProofDetailView` carry `proof_type` + `mediaUrl`
  and **not** `media_status`; `getProofs` / `getProof` / the dashboard summary need no change.
  `proof-card.tsx` already renders `customer {proofType}` generically; `proof-detail-meta.tsx` already
  labels `photo`/`audio`; `proof-detail-media.tsx` renders the non-playing seam for any `proof_type !==
  "text"`. Photo/audio flow through unchanged.
- **The one drift** (honest-copy fix): `proof-detail-media.tsx`'s bottom-right badge hard-codes "video
  stored" — generalize to the real `proof_type` so a photo/audio proof reads "photo/audio stored ·
  playback coming" (P-XIV — no mislabel). Research D7.
- **Audio-ready-at-`captured` honesty (the CRITICAL check)**: because **no surface reads `media_status`**,
  an audio proof at `captured` is presented identically to a normalized proof — it is **complete, not
  pending**. Nothing uses `media_status == 'normalized'` as a "ready" signal in the merchant UI (verified:
  the only references are in `r2.ts` withdrawal comments). Research D3.
- **media.captured** fires for photo (→ worker resize → `normalized`) and audio (→ worker skip → stays
  `captured`); the **withdrawal cascade** hard-deletes photo/audio keys automatically (key-based). No
  change to any of these.

## Complexity Tracking

*No constitution violations. No entries.*
