# Phase 1 — Data Model: T7.2b Capture Breadth

**No schema change. No migration.** The proof-type and media-status vocabularies already exist; this
slice adds photo/audio *instances* of the existing media-proof shape.

## Reused entities (unchanged)

### `proof`

| Field | For photo | For audio | Notes |
|---|---|---|---|
| `proof_type` | `'photo'` | `'audio'` | **enum already has both** — no migration |
| `mediaUrl` | private-bucket KEY | private-bucket KEY | the captured source-media R2 key (T7.4a); never a public URL |
| `media_status` | `captured` → `normalized` (worker resizes) | `captured` (worker **skips** audio) | audio at `captured` is **complete**, not pending |
| `quote` / `transcript` | null | null | no transcription (a later tier), like video |
| `thumbnail` | null | null | poster is T8 |

Consent, capture_request/token, verification_basis: **unchanged** — the same atomic
`writeCapturedProof` batch writes proof + granted-organic consent + basis for photo/audio as for video.

### `media_status` lifecycle (no change)

- **Photo**: `captured` (original in R2) → worker claims → `normalizing` → `normalized` (resized key
  written). Same as video.
- **Audio**: `captured` — the worker's `media-captured` function returns `skipped:"non-normalizable-type"`
  for non-`video`/`photo`, so audio **terminates at `captured`**. This is the honest complete state
  (stored; normalization is a future worker addition). No enum value is added.

## Additive (non-schema) type change

### `CaptureResolution` (`src/lib/capture.ts`) — used/expired gain `workspaceName`

```
type CaptureResolution =
  | { status: "ok"; request: CaptureRequestView }
  | { status: "expired"; workspaceName: string }   // NEW field (personalizes screen 10)
  | { status: "used"; workspaceName: string }       // NEW field
  | { status: "not_found" }                          // stays bare — no workspace to name
```

`getCaptureRequestByToken` already selects `workspace.name`; it returns it on the used/expired branches
(the row is present there). not_found has no row → no name.

## Content-type allowlist (additive, in `src/lib/capture.ts`)

| Set | Values | Ext |
|---|---|---|
| video (existing) | `video/webm`, `video/mp4`, `video/quicktime` | webm, mp4, mov |
| **image (new)** | `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `image/heif` | jpg, png, webp, heic, heic |
| **audio (new)** | `audio/webm`, `audio/mp4`, `audio/mpeg` | webm, m4a, mp3 |

`isAllowedCaptureType` = video ∪ image ∪ audio. Size ceiling unchanged (`CAPTURE_MAX_BYTES` = 120 MB).

## Invariants

- **INV-1 (private storage):** photo/audio media is a KEY in the private captures bucket (T7.4a) — never
  the public bucket (the class-named `presignCaptureUploadToR2` guarantees this).
- **INV-2 (atomic send unchanged):** photo/audio reuse `submitCapture` consume + `writeCapturedProof`
  batch — no partial proof, same as video/text.
- **INV-3 (zero read-edit):** photo/audio render through the existing inbox/dashboard/detail reads; no
  read/query/type change (one presentation badge string generalized).
- **INV-4 (audio complete at captured):** no surface reads `media_status`, so audio at `captured` is
  indistinguishable from a normalized proof — complete, never shown as pending.
- **INV-5 (withdrawal reaches the file):** the key-based withdrawal cascade deletes photo/audio media
  automatically (P-VII).
