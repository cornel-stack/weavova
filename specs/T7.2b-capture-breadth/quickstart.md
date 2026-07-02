# Quickstart — Verifying T7.2b Capture Breadth

Validation guide (no implementation code). Capture is browser-driven (a real device walk); the data
shape + integration are headless-checkable.

## Prerequisites

- A live capture link (`/c/[token]`) — mint one via the existing request flow (seeded or `/app/requests`).
- The normalize worker running (photo resize) — optional; the app stands without it (emit no-ops).
- `npm run dev`; a phone or a browser with camera/mic permissions for the capture walk.

## Build gate

```
npm run build   # green
npm run lint
```

## Scenario A — Photo (US1 · FR-001/002/005/009)

1. Open the link → tap **Add a photo** → pick/capture an image.
2. **Expect:** the screen-08 review ("Looks good? … Use this / Retake"); Retake re-picks.
3. **Use this** → consent (04) shows the **face-display** control + affirmative checkbox → send.
4. **DB check:** one `photo` proof; `mediaUrl` is a **private captures-bucket KEY** (not a public URL);
   granted-organic consent written atomically.
5. **Worker:** `media.captured` emitted; the photo is resized → `media_status='normalized'`.
6. **Merchant:** the photo appears in the inbox/dashboard/detail (non-playing seam), labelled "photo".

## Scenario B — Audio (US2 · FR-003/004/005)

1. Open the link → tap **Record audio** → record (timer, no video preview) → stop.
2. **Expect:** review with **audio playback**; Retake / Use this.
3. **Use this** → consent (04) **without** face-display + affirmative checkbox → send.
4. **DB check:** one `audio` proof; `mediaUrl` a private KEY.
5. **Worker:** `media.captured` emitted; the worker **skips** normalization → `media_status` stays
   `captured`.
6. **Merchant:** the audio proof renders in the inbox/detail, labelled "audio" — **complete, not
   pending** (no "processing" state); the detail badge reads "audio stored · playback coming" (not
   "video stored").

## Scenario C — Camera blocked (US3 · FR-010)

1. Deny camera permission (or use a device without one) and choose the video path.
2. **Expect:** screen 09 verbatim ("No camera? No problem. …").
3. **Upload from gallery** → file picker → review → consent → send (works). **Write it instead** → text
   path.

## Scenario D — Expired / used / not-found (US4 · FR-011)

1. Open an **expired** link → screen 10 verbatim, personalized: "{Workspace} can send you a fresh one." +
   "Ask {Workspace} for a new link" (honest **text**, not a button).
2. Open a **used** link → the honest used state, also personalized.
3. Open an **unknown** link → a **generic** block (no workspace name).

## Headless-checkable (data shape)

- After A/B, assert a `photo`/`audio` proof exists with a private-bucket `mediaUrl` key and granted
  consent; assert `media_status` = `normalized` (photo, if the worker ran) / `captured` (audio).
- Assert `getProofs` / `getProof` return photo/audio proofs with no read-layer change (proof_type +
  mediaUrl carried; no media_status field).
- Consent-withdrawal on a photo/audio proof removes the media file (the existing key-based cascade).

## Pass = all of

- A/B create real photo/audio proofs with private KEY storage and the correct consent (face-display on
  photo only).
- Photo normalizes; audio is honest-complete at `captured`; the detail badge is type-correct.
- C never dead-ends; D personalizes expired/used and stays generic for not-found, with no dead "Ask"
  button.
- No new dependency; no migration; build green.
