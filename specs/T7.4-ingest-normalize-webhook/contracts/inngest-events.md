# Contract — Inngest events + worker functions

The app **emits** events via `fetch` to the Inngest Event API (no SDK). The worker **serves** the
functions (`inngest` SDK). At-least-once delivery — both functions are idempotent.

## Emit helper (app — `src/lib/inngest-emit.ts`)

```ts
// fetch POST to the Inngest Event API; lazy env (T6 pattern); NO SDK (app stays 11 deps).
// Best-effort: a failed emit never fails the caller's durable write.
export async function emitInngest(name: string, data: Record<string, unknown>): Promise<void>;
```
- Env: `INNGEST_EVENT_KEY`, `INNGEST_EVENT_API_URL`. Missing → no-op + log (build/run green without it).

## Event: `request.created`

**Emitted by**: the webhook route after a successful mint.

```jsonc
{ "name": "request.created",
  "data": { "requestId": "uuid", "workspaceId": "uuid", "token": "string", "customerEmail": "string|null" } }
```

**Worker function `request.created`** → orchestrated Resend send:
- Reuses the shared `composeCaptureRequestEmail` + `sendCaptureRequestEmail` (`src/lib/resend.ts`) and
  records `request_send` (T7.3) — now **retry-safe** (Inngest retries a transient Resend failure).
- Idempotency: keyed on `requestId` + the send outcome; a retried send checks `request_send` and does
  not double-send an already-`accepted` request.
- Env on worker: `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM`.

## Event: `media.captured`

**Emitted by**: `writeCapturedProof` (queries.ts) after the batch write, **only** when `mediaUrl`
present (D7 — NOT from the frozen `/c/[token]` route).

```jsonc
{ "name": "media.captured",
  "data": { "proofId": "uuid", "workspaceId": "uuid", "mediaKey": "string", "proofType": "video|photo|audio" } }
```

**Worker function `media.captured`** → ffmpeg normalize (D6):
1. Load the proof; **idempotency gate** — proceed only if `media_status IN (captured, normalizing)`;
   if `normalized` → **no-op return**.
2. Set `media_status='normalizing'` (claim).
3. Pull the captured object from R2 (`mediaKey`).
4. Normalize: **video** → cap ≤1080p, re-encode H.264/AAC MP4, **bake rotation**; **photo** → resize;
   **audio** → skip (deferred).
5. Write the normalized object to a **deterministic key** (`capture/{ws}/{proofId}/normalized.mp4`) —
   a retry overwrites the same object, never duplicates.
6. Update proof: `normalized_media_url=<key>`, `media_status='normalized'`.

**Failure**: any error → `media_status='failed'`; **original `mediaUrl` retained**; no
`normalized_media_url` written; throw so Inngest records the failure (bounded retries, then `failed`
stays). Never a crash loop.

## Idempotency summary (at-least-once safe)

| Function | Key | Guard |
|----------|-----|-------|
| `request.created` | `requestId` + `request_send` status | skip if already `accepted` |
| `media.captured` | `proofId` + `media_status` | act on `captured`/`normalizing`; skip `normalized`; deterministic output key |

## Re-sync on redeploy (D8 / SC-008)

The worker registers its functions with Inngest on boot (auto-sync) and exposes `/health` reporting
registration state. **Mandatory** post-deploy verification — a stalled registration is caught, not
discovered later (the Bristle failure mode).
