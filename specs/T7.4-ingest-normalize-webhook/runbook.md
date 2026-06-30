# Provisioning Runbook — T7.4 Worker (Railway + Inngest Cloud)

**Owner:** Cornel (the T6 verify-with-real-infra pattern). The app **and** the worker both
**build green without any of this** — this runbook stands up the LIVE path. Inngest is **managed
cloud** (Inngest Cloud's hosted servers call the worker; we do **not** self-host the Inngest server).

> Two deployables, one repo: the **Vercel app** (emits events, stays at 11 runtime deps) and the
> **Railway worker** (`worker/`, serves the Inngest functions; ffmpeg + Inngest SDK are worker-side
> only). The worker is the FIRST tenant of the Railway host; T8's renderer is added later as a
> **second service** — not a re-stand-up.

---

## Env split (what goes where)

| Variable | App (Vercel) | Worker (Railway) | Purpose |
|---|:---:|:---:|---|
| `INNGEST_EVENT_KEY` | ✅ | — | app → Inngest Event API (emit) |
| `INNGEST_EVENT_API_URL` | optional | — | defaults to `https://inn.gs` |
| `INNGEST_SIGNING_KEY` | — | ✅ | Inngest → worker auth (serve) |
| `DATABASE_URL` | ✅ (existing) | ✅ | the SAME Neon DB |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | ✅ (existing) | ✅ | the SAME R2 bucket (read original / write normalized) |
| `R2_PUBLIC_BASE_URL` | ✅ (existing) | — | app builds public URLs; worker writes by key |
| `AUTH_RESEND_KEY` / `AUTH_EMAIL_FROM` | ✅ (existing) | ✅ | orchestrated capture-request send |
| `APP_PUBLIC_URL` | — | ✅ | builds the absolute `/c/<token>` link in the email |
| ffmpeg (system binary) | ❌ never | ✅ (in the image) | normalize |

Templates: app additions in `.env.example`; worker block in `worker/.env.example`.

---

## Ordered steps

### 1. Railway service (from the GitHub repo)
1. Railway → **New Project → Deploy from GitHub repo** → pick this repo.
2. Service → **Settings → Build**:
   - **Builder:** Dockerfile
   - **Dockerfile Path:** `worker/Dockerfile`
   - **Root Directory:** *(leave as the repo root — the build context MUST be repo root so the
     worker can import the shared `src/db/schema.ts`; do NOT set it to `worker/`)*
3. Do **not** deploy yet (no env set). If it auto-builds, that's fine — it'll be reachable but idle.

### 2. Inngest Cloud app + keys
1. Inngest Cloud → create an app/environment (Production).
2. **Event Key** → copy (this is the app's `INNGEST_EVENT_KEY`).
3. **Signing Key** → copy (this is the worker's `INNGEST_SIGNING_KEY`).

### 3. Worker Variables (Railway → service → Variables) + deploy
Set, then deploy:
```
INNGEST_SIGNING_KEY = signkey-prod-…
DATABASE_URL        = <same pooled Neon URL as the app>
R2_ACCOUNT_ID       = …
R2_ACCESS_KEY_ID    = …
R2_SECRET_ACCESS_KEY= …
R2_BUCKET           = weavova-media
AUTH_RESEND_KEY     = re_…
AUTH_EMAIL_FROM     = hello@<verified-resend-domain>
APP_PUBLIC_URL      = https://<your-app>.vercel.app
```
Deploy. Confirm the logs show `weavova-worker listening on :<PORT> — serving 2 function(s)`.

### 4. Generate the worker domain
Railway → service → **Settings → Networking → Generate Domain**. Copy the URL, e.g.
`https://weavova-worker-production.up.railway.app`. The serve endpoint is `…/api/inngest`.
Smoke-test: `curl https://<worker>/health` → `{"status":"ok","functions":["request-created-send","media-captured-normalize"],…}`.

### 5. Sync the app in Inngest (register the functions)
Inngest Cloud → your app → **Sync / Apps → Sync new app** → enter `https://<worker>/api/inngest`.
Confirm **2 functions registered**: `request-created-send`, `media-captured-normalize`.
(The worker also auto-syncs on every boot, so a redeploy re-registers.)

### 6. App env on Vercel + redeploy
Vercel → Project → Settings → Environment Variables:
```
INNGEST_EVENT_KEY     = <Event Key from step 2>
INNGEST_EVENT_API_URL = (omit — defaults to https://inn.gs)
```
Redeploy the app. Now a webhook POST mints (durably) **and** schedules the orchestrated send;
a video capture mints + schedules normalize.

### 7. ⚠️ MANDATORY re-sync-on-redeploy verification (SC-008) — NON-OPTIONAL
After **every** Railway redeploy (now and forever):
1. `curl https://<worker>/health` → both function ids present.
2. Inngest dashboard → the app shows **synced** + **2 functions** (not stale).

A stalled sync = events fire and **nothing runs** — the silent failure mode (the "Bristle"
cron-stall). The worker auto-syncs on boot to prevent it, but **verify** it every redeploy; do not
assume.

---

## Notes
- **ffmpeg** is installed in the worker image (`apt-get install ffmpeg`) — a worker/host dep, **never**
  an app dep. The app's `package.json` stays at 11 runtime deps.
- **Railway free ephemeral storage ≈ 1 GB.** The normalize function works in a fresh `mkdtemp` dir and
  removes it in a `finally` — scratch never accumulates.
- **Idempotency is two-layered**: the app's `webhook_event` ledger (duplicate webhook → one mint) **and**
  the Inngest event `id` (the app sets `media.captured:<proofId>` so Inngest dedupes a re-delivery);
  worker functions are additionally status-gated with deterministic output keys, safe under Inngest's
  at-least-once retries.
- **Failure is honest**: a normalize error (after bounded retries) sets `media_status='failed'`, retains
  the original `mediaUrl`, writes no `normalized_media_url`, and never crash-loops. A Resend failure is
  recorded as `failed` (never a silent "sent") and retried.
- **T8 forward**: the renderer joins this Railway project as a SECOND service (its own Dockerfile/
  entrypoint, same base-image + shared-schema pattern) — not a host re-stand-up.
