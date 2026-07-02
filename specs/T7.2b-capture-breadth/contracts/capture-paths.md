# Contract — Photo + Audio capture paths

Both paths **reuse** the frozen send/consent/storage primitives. Only the client `path` and
`submitCapture`'s branch widen.

## Photo path (design: `08 _ Add a photo`)

1. Prompt → "Add a photo" → `choosePath("photo")`.
2. A file input `accept="image/*"` (with the `capture` hint) → OS camera or gallery → a chosen image.
3. **Review (screen 08)**: "Looks good? Not sent yet — you can retake." → **Retake** (re-pick) / **Use
   this**.
4. Use this → `presignCaptureUpload({ contentType, sizeBytes })` (validates image type + size → private
   bucket KEY) → browser PUTs the bytes to R2 → `submitCapture({ path:"photo", mediaKey })`.
5. Consent (04) — **with** the face-display control (a photo may show a face) + affirmative checkbox.
6. Atomic send (unchanged) → `proof_type='photo'`, `mediaUrl=key`, `media.captured` emitted → worker
   resizes → `normalized`.

## Audio path (pattern: `02 _ Recording` / `03 _ Review`, audio treatment — research D1)

1. Prompt → "Record audio" → `choosePath("audio")`.
2. MediaRecorder **audio** (mic): record / stop, a running elapsed-time indicator, **no video preview**.
3. **Review**: play the recorded blob back → **Retake** / **Use this**.
4. Use this → `presignCaptureUpload` (validates audio type → private bucket KEY) → PUT → `submitCapture({
   path:"audio", mediaKey })`.
5. Consent (04) — **without** face-display (no face) + affirmative checkbox.
6. Atomic send (unchanged) → `proof_type='audio'`, `mediaUrl=key`, `media.captured` emitted → worker
   **skips** (non-normalizable) → stays `captured` (complete).

## Send-path contract (`submitCapture`, additive)

```
path: "text" | "video" | "photo" | "audio"    // was "text" | "video"
- photo: require mediaKey → proofType="photo", mediaUrl=mediaKey
- audio: require mediaKey → proofType="audio", mediaUrl=mediaKey
- the consume + db.batch core is UNCHANGED (media-agnostic)
```

## Upload contract (`presignCaptureUpload`, additive)

- Accepts any `isAllowedCaptureType` (video ∪ image ∪ audio).
- Still token-scoped + non-consuming; still routes to the **private captures bucket** via
  `presignCaptureUploadToR2` + `captureMediaKey` (KEY). Honest inline rejection for unsupported/oversized.

## Guarantees

| Guarantee | Mechanism | Ref |
|---|---|---|
| Photo/audio are real proofs | reuse `submitCapture` + `writeCapturedProof` | FR-001..004 |
| Private KEY storage | `presignCaptureUploadToR2` (captures class) | FR-002/004 · INV-1 |
| Same consent, face-display where a face may appear | consent (04); control on photo, not audio | FR-009 · D6 |
| Photo normalized, audio honest-complete | worker resize / skip (built) | FR-005 · INV-4 |
| No dead "coming" controls | photo/audio go live; prompt has no stub | FR-001/003 · P-XIII |
| No new dep / no migration | browser APIs; enum already has photo/audio | FR-014 |
