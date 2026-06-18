# Phase 0 Research — T4-B2 Brand-asset store

Two decisions are **surfaced for ratification, not settled** (§1 the primary STOP; §2 secondary). §3–§4 are
resolved.

---

## §1 — R2 upload mechanism + the first new dependency  ⛔ DECISION TO RATIFY (do not pre-pick)

### The situation (grounded in the codebase)

- **There is no real R2 wiring to reuse.** The brief said "reuse whatever R2 config already exists for the
  sample clip" — but there is none. `src/lib/clip.ts` defines `SAMPLE_CLIP_URL = "r2://weavova-samples/press-
  run-sample.mp4"` as a **literal placeholder** used by the seed and shown as a non-playing "Sample preview".
  No S3/R2 SDK, no R2 client, no R2 env vars exist (`grep` for r2/s3/aws/presign/bucket finds only that
  literal + display code). The only env var is `DATABASE_URL`.
- **Therefore B2 introduces the project's first real R2 integration**: a new `src/lib/r2.ts`, new R2 env vars,
  and — almost certainly — **the first new runtime dependency since T0**.
- **These are product videos — potentially large.** Routing large video bytes **through** a Next.js route
  handler / Server Action on Vercel is a poor fit (request-body limits; Active-CPU billing on multi-MB
  bodies; needless memory pressure). The bytes should go **straight to R2**.

### Decision 1a — Transport: presigned direct-to-R2 vs server-proxied

| Option | How | Pros | Cons |
|--------|-----|------|------|
| **A — Presigned PUT, browser → R2 (RECOMMENDED)** | A Server Action returns a short-lived **presigned URL** (signed for a specific key + content-type + max size); the browser `PUT`s the file **directly to R2**; a second Server Action records the `brand_asset` row once the PUT succeeds | Bytes never touch Vercel (no body-limit / Active-CPU / RAM cost); honest `uploading` progress via the browser `PUT`; standard R2/S3 pattern; smallest server surface | Two-step (presign → PUT → confirm); CORS must be configured on the R2 bucket; client trusts the presign constraints (mitigated: sign content-type + enforce size both client-side and via the presign policy) |
| B — Server-proxied (multipart → route handler → R2) | Browser POSTs the file to a route handler; the server streams it to R2 | One round-trip; server fully controls validation | Large bytes transit Vercel (request-body limits; Active-CPU cost; RAM on a constrained build host); worst fit for "product videos"; contradicts the brief's own warning |

**Recommendation: A (presigned PUT direct-to-R2).** It is the only option that respects Vercel's limits for
video and keeps the server surface tiny. (If a future need for server-side post-processing appears, that is
T8's render worker, not B2.)

### Decision 1b — The dependency (THE conscious dep decision — first since T0)

R2 is S3-compatible; a **presigned PUT** needs only SigV4 request signing. Three ways to get it:

| Option | What it is | Bundle / install | Build & RAM cost (7.6 GiB SFF) | Complexity | Verdict |
|--------|-----------|------------------|-------------------------------|------------|---------|
| **A — `aws4fetch` (RECOMMENDED)** | A tiny (~6–7 kB) SigV4 signer for `fetch`; sign a `PUT` URL/request for R2 | One small dep, near-zero install/build footprint | Negligible — no native deps, trivial transpile | Low: build the R2 endpoint URL + sign; ~30–40 lines in `r2.ts` | **Best fit** — minimal surface for "presign one PUT", honours "smallest honest dependency" |
| B — `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` | The official AWS SDK v3 modular client + presigner | Two deps; **large** transitive tree (hundreds of kB → MBs), many sub-packages | Heaviest install + `node_modules` growth + slower cold builds; most memory pressure on a 7.6 GiB SFF | Low-medium: idiomatic `getSignedUrl(new S3Client(...), new PutObjectCommand(...))` | Works, but **far** heavier than "sign one PUT" warrants; reconsider only if we later need rich multipart/lifecycle ops |
| C — Hand-rolled SigV4 | Implement AWS SigV4 with `node:crypto` | **Zero** new deps | None | **High**: SigV4 is fiddly + security-sensitive; easy to get canonicalization/edge-cases subtly wrong | Rejected — re-implementing signing for "one new dep avoided" is poor risk/reward |

**Recommendation: B-1b = `aws4fetch`** — one tiny, well-scoped dependency, presented for ratification as the
**first conscious dep decision since T0** (P-III). It buys exactly what we need (sign a presigned R2 PUT) with
the least bundle/build/RAM cost on the constrained host, and no security-sensitive hand-rolling. **Pending
Cornel's ratification** — if you'd rather avoid any new dep, we take option C (hand-rolled, accepted as more
code + careful review); if you anticipate needing the full S3 toolkit soon, option B (heavy).

> **⛔ STOP — ratify before any install/implement:** (i) transport = presigned direct-to-R2 (rec. A); (ii)
> dependency = `aws4fetch` (rec.), vs `@aws-sdk/*` (heavy) vs hand-rolled (no dep, more code).

### Decision 1c — Validation, states, env (apply once 1a/1b are ratified)

- **File-type validation** — allowlist of web-deliverable video MIME types (default **`video/mp4`,
  `video/quicktime` (.mov), `video/webm`**), enforced **client-side** (input `accept` + pre-PUT check) **and**
  bound into the **presign** (sign the exact `Content-Type`) so a mismatched PUT is rejected by R2. Final list
  ratified at review.
- **Size validation** — a `MAX_BYTES` constant (default **~100 MB**, sized for short product clips), checked
  client-side before requesting a presign and reflected in the presign policy where supported; an oversize
  file never reaches R2. Final cap ratified at review.
- **Honest upload states (A-11 / FR-004)** — a small client state machine: `idle → uploading
  (browser PUT, with progress) → stored (row recorded)` or `→ failed (validation reject, PUT error, or
  record-row error)`. A `failed`/partial upload is shown in its true state and is **retryable**; it is
  **never** presented as stored. If the PUT succeeds but recording the row fails, the UI shows `failed` (the
  orphaned R2 object is acceptable debris pre-cleanup — store-delete/cleanup is the deferred Q2:A follow-up).
- **Credentials / config (new env)** — a new `src/lib/r2.ts` reads R2 config **lazily** (mirroring `getDb()`
  so `typecheck`/`lint`/`build` stay green without creds). New env keys (names; values are Cornel's), added to
  `.env.example`:
  - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (write/presign target),
    `R2_PUBLIC_BASE_URL` (or an account-derived endpoint) for constructing the stored `assetUrl`.
  - The R2 **S3 API endpoint** is `https://<account_id>.r2.cloudflarestorage.com`. The bucket needs **CORS**
    allowing `PUT` from the app origin (a one-time bucket config, documented in quickstart.md).
  - `SAMPLE_CLIP_URL` stays the literal seam for the stubbed clip render — **unchanged**; B2's real R2 wiring
    is for **brand-asset** objects only.

---

## §2 — Navigation entry for the derived store route  ◻ DECISION TO RATIFY (secondary)

**Situation**: Q1:A chose a **dedicated `/app` route** for the store. But `src/lib/nav.ts` is "**the eight
rail/palette destinations, in the /design-reference chrome order**" — a faithful port. The store has **no
design-reference screen and no chrome slot**, so adding it to the rail is a (small) deviation from the ported
chrome (P-V).

| Option | How it's reached | Pros | Cons |
|--------|-----------------|------|------|
| **A — Palette + inline-from-proof (RECOMMENDED)** | The route exists at a stable path; reached via the **command palette** (a "Go to" + an "Add brand footage" action — the palette already carries action items) and via a **"Manage / upload footage"** link from the proof-detail attach picker | **No change to the ported 8-destination chrome** (P-V preserved); the route still fully exists and is linkable | Slightly less discoverable than a rail item |
| B — Add a 9th rail item (e.g. "Footage") | A new `NAV_ITEMS` entry (rail + palette "Go to") | Most discoverable; first-class store | A **conscious chrome change** beyond the design-reference port — needs explicit ratification; risks blurring B2 footage with T5 "Brand kits" in the rail |
| C — Hybrid | Ship A now; revisit a rail slot when the broader chrome is revisited | Keeps chrome stable now, leaves the door open | Defers the discoverability question |

**Recommendation: A** — keep the ported chrome byte-stable; reach the derived route via the palette + the
attach flow. Choose B only if you want the store as a first-class rail destination now (accepting the chrome
deviation). **Ratify at review.**

---

## §3 — Derived-surface basis (resolved)

No `/design-reference` screen exists for a reusable brand-asset store (design-reference **B2 is "Add proof
(upload)"** — manual *customer-proof* upload, a different feature). Precedent: **T3.2 clip detail** was a
**derived surface** built from neighbouring ported patterns. B2 reuses, faithfully on Pressroom tokens:

- **Route shell**: the `library/page.tsx` pattern — Server Component resolves workspace via the unchanged
  `getCurrentWorkspace()` seam, `Suspense` + a skeleton, an async data integrator doing the workspace-scoped
  read (mirrors `LibraryData`).
- **Cards / list**: the Library clip-card grid pattern for the store list; each asset card is **honestly
  labeled the brand's own footage** (a kind chip `product`/`broll` + the free label), **never** the verified
  customer mark, **never** a proof framing (FR-019).
- **Proof-detail section**: the existing screen-03 section pattern (e.g. the "Generated assets" section) for
  the additive **"Attached brand assets"** section — same heading/section rhythm, additive props.
- **Upload widget + attach picker**: client islands using existing button/control tokens; empty/loading/error
  states reuse the shared skeleton + `<ErrorState>` conventions.

Documented as a **derived surface** in code comments (as T3.2 did).

## §4 — Honest T8-composite seam (resolved)

- **`generateClip` / `generateBatch` are byte-unchanged.** They still write a `derived_asset` pointing at
  `SAMPLE_CLIP_URL` and reveal it as a sample/preview. An attached brand asset **does not** alter the
  generated output in B2 — the composite is **T8**.
- **The seam is a label, not a preview.** The attached-assets section states honestly that the asset **"will
  appear in the rendered clip when rendering ships (T8)"** — an explicit deferred state, mirroring how the
  clip itself is a non-playing "Sample preview". **No fabricated combined-output preview** anywhere (FR-007 /
  A-11). The attachment is forward-looking; it never retro-claims that already-generated sample clips include
  the asset.
- **Consent is untouched by all of this** (P-VII): the attach writes only to `proof_brand_asset`; generation
  still gates solely on `getGrantedConsentId`.

---

## Consolidated decisions

| # | Decision | Status | Recommendation |
|---|----------|--------|----------------|
| 1a | Upload transport | **RATIFY** | Presigned PUT, browser → R2 |
| 1b | New dependency (first since T0) | **RATIFY** | `aws4fetch` (tiny SigV4 signer) vs `@aws-sdk/*` (heavy) vs hand-rolled (no dep) |
| 1c | Validation / states / env | Resolved (applies post-ratify) | video MIME allowlist + ~100 MB cap; `uploading/stored/failed`; new `R2_*` env, lazy `r2.ts` |
| 2 | Nav entry for derived route | **RATIFY** | Palette + inline-from-proof (no rail change) vs a 9th rail item |
| 3 | Derived-surface basis | Resolved | Port `library` shell + card/section patterns; document as derived (T3.2 precedent) |
| 4 | T8 seam | Resolved | Honest deferred label; `generateClip`/`generateBatch` byte-unchanged; no fake preview |
