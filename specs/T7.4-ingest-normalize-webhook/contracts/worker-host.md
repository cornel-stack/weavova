# Contract — Railway worker host (topology + provisioning runbook)

## Repo layout (one repo, two deployables)

```text
weavova/
├── src/…                 # the Vercel app (unchanged build; imports NO worker code, NO Inngest SDK)
├── worker/               # the Railway deployable (separate package.json)
│   ├── package.json      # inngest, drizzle-orm, @neondatabase/serverless, aws4fetch, http server; next-auth (type devDep, D9)
│   ├── Dockerfile        # FROM node; apt-get install ffmpeg; build context = REPO ROOT (to import ../src/db/schema.ts)
│   └── src/{index,inngest,normalize}.ts + functions/
└── drizzle/              # shared migrations (app owns; worker reads the same Neon DB)
```

- **Schema sharing (D9, recommended)**: the worker imports the **shared `src/db/schema.ts`** (single
  source of truth — no drift, P-VI). Railway builds from the **repo-root context** via `worker/Dockerfile`
  so the relative import resolves; `next-auth` is a worker **type-only devDep** (erased at runtime; app's
  11 runtime deps untouched). *Confirm at /speckit-tasks.*
- **DB/R2 access**: the worker connects to the **same Neon DB** (`@neondatabase/serverless` + Drizzle)
  and **same R2 bucket** (`aws4fetch`) — its own clients, the same data. No shared app runtime code
  beyond the schema + the `resend.ts` helper (a plain fetch).

## T8 forward contract (second service, not a rebuild)

The Railway **host/project** is stood up so T8's Remotion renderer is **added as a second service**
(its own `Dockerfile`/entrypoint under the same project, sharing the base image pattern + the schema
import), **not** a host re-stand-up (FR-010 / SC-007). The normalize worker is the first tenant.

## Provisioning runbook (Cornel-owned — the T6 pattern; build green without it)

**1. Inngest**
- Create the Inngest app/account.
- Get the **event key** → set `INNGEST_EVENT_KEY` + `INNGEST_EVENT_API_URL` on **Vercel** (app emits).
- Get the **signing key** → set `INNGEST_SIGNING_KEY` on **Railway** (worker serves).

**2. Railway (worker)**
- Create the Railway project + a service pointing at this repo; Dockerfile path `worker/Dockerfile`,
  build context = repo root.
- Set worker env: `INNGEST_SIGNING_KEY`, `R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/BUCKET/PUBLIC_BASE_URL`,
  `DATABASE_URL`, `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM`.
- Deploy. **ffmpeg** is installed in the image (apt) — a **worker/host dep, NOT an app dep**.

**3. Register + the MANDATORY re-sync verify (SC-008)**
- Point Inngest at the worker's serve endpoint (`https://<worker>/api/inngest`).
- After **every** redeploy, verify functions re-registered (the worker auto-syncs on boot; check
  `/health` + the Inngest dashboard). A stalled registration = events fire, nothing runs (the Bristle
  cron-stall). This is a **non-optional** step.

## Env split (summary)

| Env | App (Vercel) | Worker (Railway) |
|-----|:---:|:---:|
| `INNGEST_EVENT_KEY`, `INNGEST_EVENT_API_URL` | ✅ (emit) | — |
| `INNGEST_SIGNING_KEY` | — | ✅ (serve) |
| `R2_*` | ✅ (existing) | ✅ (read/write media) |
| `DATABASE_URL` | ✅ (existing) | ✅ (update proof) |
| `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM` | ✅ (existing) | ✅ (orchestrated send) |
| ffmpeg (system binary) | ❌ never | ✅ (image) |

**Dependency boundary**: app **stays at 11** runtime deps (no Inngest SDK, no ffmpeg). Worker deps are
host-side, counted/owned separately (SC-006).
