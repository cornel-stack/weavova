# Phase 0 — Research: T7.2b Capture Breadth

Grounded in the live capture spine + T7.4/T7.4a. The settled decisions are carried; new decisions
surfaced with recommendations. No open `NEEDS CLARIFICATION`.

## D1 — Audio capture design (no dedicated screen exists)

**Decision:** Port the **02/03 recording/review pattern** adapted for audio — a microphone recorder with
a running elapsed-time indicator (no video preview), and a review step that plays the recorded audio
back with Retake / Use this. No bespoke audio design is invented.

**Rationale:** Step 0 confirmed there is no audio screen in `design-reference/Weavova/Capture/`. The
port-don't-invent rule forbids authoring a new design. The 02 (Recording) / 03 (Review) pattern is the
proven, designed shape for on-device capture; adapting it to audio (drop the camera preview, keep the
record/stop + timer + review-and-confirm) is a faithful, documented adaptation rather than an invention.
**Flagged and confirmed** with the requester before planning.

**Alternatives considered:** invent an audio-specific screen (rejected — P-V/P-XII, the Capture-detour
lesson); defer audio entirely (rejected — audio completes the four types and the capture is fully real).

## D2 — Upload content-type allowlist extension (image + audio)

**Decision:** Extend the allowlist (in `src/lib/capture.ts`) additively:
- **Image**: `image/jpeg`, `image/png`, `image/webp`, and `image/heic`/`image/heif` (iOS libraries often
  deliver HEIC; the worker's ffmpeg re-encode to JPEG normalizes it).
- **Audio**: `audio/webm`, `audio/mp4`, `audio/mpeg` (the formats MediaRecorder emits across browsers).
`isAllowedVideoType` generalizes to `isAllowedCaptureType`; `EXT_BY_TYPE` gains matching extensions.
Storage is unchanged — the **private captures bucket**, a KEY, via the existing presigned PUT.

**Rationale:** These cover the real capture paths (camera/gallery image, MediaRecorder audio) without a
new dependency. HEIC is included because iOS "Add a photo" from the library commonly yields HEIC; the
worker already re-encodes photos to JPEG (long-edge ≤ 2048), so HEIC input is normalized. `CAPTURE_MAX_
BYTES` (120 MB) already comfortably bounds a photo/short audio clip.

**Alternatives considered:** a narrower image set excluding HEIC (rejected — would reject common iOS
picks); a separate size ceiling per type (deferred — the existing ceiling is sufficient).

## D3 — Audio-ready-at-`captured` honesty (the CRITICAL check)

**Decision:** Audio ends at `media_status='captured'` and is treated as **complete, not pending**. No
change is needed to make it "ready" because **no merchant surface reads `media_status`**.

**Rationale (verified in code):** `ProofView` / `ProofDetailView` (`src/lib/proof.ts`) carry
`proof_type` + `mediaUrl` but **not** `media_status`; the inbox/dashboard/detail reads
(`getProofs`, `getProof`, `getDashboardSummary`) never select or branch on it. The only references to
`normalized` outside the worker/queries are `r2.ts` withdrawal comments. So an audio proof at `captured`
renders **identically** to a normalized photo/video (the non-playing seam) — it is not, and cannot be,
shown as stuck/processing. The worker already skips audio (`media-captured.ts`: non-`video`/`photo` →
"non-normalizable-type"), so no worker change is required.

**Alternatives considered:** mark audio `normalized` to force a "ready" look (rejected — dishonest;
`normalized` implies a normalized key exists, which audio has none); add a `stored`/`unsupported` status
(rejected — unnecessary enum change; nothing reads status anyway).

## D4 — Screen-10 workspace-name personalization

**Decision:** Return `workspaceName` on the `used`/`expired` resolutions (additive to `CaptureResolution`
+ `getCaptureRequestByToken`) and show it on screen 10; **not-found stays generic**.

**Rationale:** `getCaptureRequestByToken` already `select`s `workspace.name` and has `row.workspaceName`
in scope on the used/expired branches — it simply doesn't return it. The additive change is trivial and
touches no core (the token model, single-use/expiry, and the send are unchanged). Showing the name to the
link-holder is **not a leak**: the token genuinely maps to that workspace and the holder received the
link from them. Not-found has no `row` → no workspace → generic (no enumeration).

**Alternatives considered:** keep the block fully generic (rejected — diverges from the design, which
personalizes); personalize not-found too (impossible + unsafe — no workspace for an unknown token).

## D5 — The "Ask {Workspace} for a new link" affordance

**Decision:** Port it as **honest guidance text**, not a functional/interactive button.

**Rationale:** No customer→merchant request channel exists (the customer can't trigger a new link from
the capture page). A button styled to look actionable that does nothing is a dead control (P-XIII). The
honest port frames what to do ("Ask {Workspace} for a new link") as guidance — the customer reaches the
business through the channel they already have (the business sent them the original link).

**Alternatives considered:** a `mailto:` (rejected — the capture page has no workspace contact email, and
wiring one is out of scope); a real "request a new link" action (rejected — no such capability exists; it
would be a new feature, not a port).

## D6 — Face-display consent for photo vs audio

**Decision:** The consent step's face-display control applies to **photo** (a photo may show a face),
consistent with video; **audio omits it** (no face). Same scoped, granted-organic consent (04), same
affirmative checkbox, same T7.4a private-key storage.

**Rationale:** Face-display governs how a customer's face is shown on a derived clip (P-VII/T7.1). It is
meaningful for any proof that can contain a face (video, photo) and meaningless for audio. The existing
control is gated on `path === "video"`; widening it to `photo` is the correct, minimal extension.

## D7 — The `proof-detail-media` "video stored" badge (honest-copy fix)

**Decision:** Generalize the hard-coded badge to the real `proof_type` — "photo stored" / "audio stored"
/ "video stored", "playback coming".

**Rationale:** `proof-detail-media.tsx` renders the non-playing seam for any `proof_type !== "text"` but
its bottom-right badge is hard-coded "video stored · playback coming". A photo/audio proof would wrongly
read "video stored" — a fabricated mislabel (P-XIV). This is a presentation-copy fix, not a data-read
change (the zero-read-edit property holds at the data layer; this one label was video-specific).

## No open clarifications

All resolved. If implementation reveals a needed change to a frozen core (the atomic send/consume, token
model, consent write, T7.4a storage, the worker), **stop and surface** rather than proceed (P-V).
