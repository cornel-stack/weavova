# Phase 0 Research — Capture spine + request primitive

Grounded in the real code: `src/middleware.ts` (route gate), `src/app/app/footage/actions.ts` (the B2
presigned-PUT pattern), `src/lib/r2.ts` (`presignPut`/`assetUrlForKey`), `src/db/client.ts` (the
`neon-http` driver), `src/db/queries.ts` (the read surfaces + write idioms), the T7.1 consent model.
**One open clarification: C1 (QR).**

## R1 — Proof-source resolution (the integration crux)

- **Decision**: add **`'link'`** to the code-side `SOURCE_KINDS` allowlist (`source.kind` is `text` → no
  migration). The `capture_request` carries a **`sourceId`** pointing at the workspace's `link` source;
  the captured proof's `sourceId` = that source. Seed creates one `link` source per workspace (label
  "Capture link").
- **Rationale**: `proof.sourceId` is NOT NULL (FK restrict), so a captured proof needs a real source.
  The owner reads select **`source: source.label`** and **never branch on `source.kind`** — so a
  `link`-sourced proof is **fixture-shaped** and renders with **zero edits**. The label "Capture link" is
  **real owned data** (P-XIV), not fabricated.
- **Alternatives**: (a) a nullable `proof.sourceId` — rejected, changes the proof shape + the fixture
  contract; (b) a synthetic per-proof source — rejected, noise; (c) reuse an existing kind (e.g.
  `instagram`) — rejected, dishonest provenance (P-XIV).
- **P-V risk check**: **none** — confirmed against `getProofs` / `getProof` / `getDashboardSummary`
  (they read `label`, `proofType`, consent `state`; none reads `kind`). If implementation reveals any
  consumer that branches on `kind`, **STOP** and surface it.

## R2 — Unauthenticated route + token resolution (no middleware, no session)

- **Decision**: `/c/[token]` lives at `src/app/c/[token]/` — **outside** the middleware matcher
  (`["/app/:path*"]`) and outside the `/app` layout chrome. It inherits only the **root layout** (fonts +
  ThemeProvider). Workspace + brand resolve **from the token** via `getCaptureRequestByToken(token)`; the
  capture Server Actions are **token-scoped** and never call `getCurrentWorkspace()`.
- **Rationale**: the matcher already excludes `/c/*`, so no middleware change is needed (and none is
  wanted — the page must be reachable with no session). The token is the **capability**: it authorizes a
  single workspace's capture. Security is bounded by **single-use + 72h expiry** + server-side token
  validation on every action; abuse-rate-limiting is noted as future (not this slice).
- **Alternatives**: a route group `(public)` — unnecessary; `src/app/c/` is already chrome-free. Passing
  workspaceId from the client — rejected (never trust the client; resolve from the token server-side).

## R3 — Atomic send on `neon-http` (no interactive transactions)

- **Decision**: **consume-first conditional UPDATE** + **`db.batch([...])`**. (1) One atomic
  `UPDATE capture_request SET status='used', usedAt=now() WHERE token=$1 AND status='open' AND
  expires_at > now() RETURNING …` — the single-use guard; 0 rows ⇒ honest block, no writes. (2) If
  consumed, `db.batch` the **proof + consent + verification_basis** inserts (client-generated UUIDs so
  dependent ids are known) as **one transaction**.
- **Rationale**: the client is `drizzle-orm/neon-http`, which has **no interactive `db.transaction()`**
  (each query is a separate HTTP round-trip). `db.batch()` runs multiple statements in **one
  transaction** over HTTP, giving all-or-nothing for the inserts (no partial proof). The conditional
  UPDATE is the atomic **single-use** control — the same "guard via a conditional/unique write" idiom the
  repo already uses (the `(proofId,version)` unique index; the `recordConsentWithdrawal` re-check).
- **Failure semantics**: a **post-consume batch failure** burns the token (no proof written — batch is
  atomic) and returns an honest error; the customer requests a new link (acceptable under single-use
  security). **P-VII**: proof + its granted consent are in the **same batch**, so a proof never exists
  without consent; even a hypothetical orphan fails closed (withheld) under the existing read gate.
- **Alternatives**: (a) switch this path to the **neon-serverless Pool** driver for real transactions
  (same package, no new dep, but a second DB connection style + WebSocket) — heavier than needed given
  `batch` suffices; reconsider only if a future path needs interleaved reads mid-transaction. (b)
  consume-last (write then mark used) — rejected, opens a double-submit window.

## R4 — Media capture (MediaRecorder) + presigned PUT + upload fallback

- **Decision**: reuse the **B2 presigned-PUT flow** (server signs, browser PUTs bytes directly to R2).
  Video is captured with **MediaRecorder** (getUserMedia → record → Blob), then PUT to the signed URL.
  An **upload fallback** (`<input type=file accept="video/*" capture>`) covers unsupported
  MediaRecorder/getUserMedia and is the seam **screen 09** (camera-blocked) plugs into at T7.2b. New
  additive `captureMediaKey(workspaceId, suffix)` in `r2.ts`; reuse `presignPut` + `assetUrlForKey`.
- **Rationale**: keeps **bytes off the app server** (FR-006), reuses a proven path, **no new dep**
  (MediaRecorder is browser-native). The presign action is **token-scoped** (validates the token,
  resolves workspace from the request — not the session).
- **Alternatives**: upload-only spine (Q3=B) — rejected per the resolved Q3 (diverges from screen 02's
  live-record framing). Server-side recording — impossible/again routes bytes through the server.
- **Content types**: `video/webm` (Chrome/Firefox MediaRecorder default), `video/mp4`,
  `video/quicktime`; a capture `MAX_BYTES`. Audio/photo types are T7.2b.

## R5 — Verification basis as a separate stub table

- **Decision**: a new **`verification_basis`** table (`id`, `proofId`, `requestId`, `consentCapturedAt`
  real, `transactionVerifiedAt` **null = stub**, `createdAt`) — **not** columns on `proof`.
- **Rationale**: keeps the **proof shape byte-identical to the fixtures** (the FR-008 contract + the
  zero-edit integration). The two legs are explicit: **consent leg real** (timestamped here),
  **transaction leg null** (T7.5). `proof.verified` stays **false**; **no stamp** is derived until both
  legs exist (P-XIII / P-XIV). When T7.5 sets `transactionVerifiedAt`, the verified bar can light up.
- **Alternatives**: nullable columns on `proof` — rejected (changes the proof shape/contract); a JSON
  blob — rejected (the transaction leg wants to be queryable later, like T7.1's scope decision).

## R6 — Display prefs at capture + `resolveDisplay` server enforcement

- **Decision**: the consent screen (04) shows the **name + face** choice **pre-filled from the workspace
  default** (`workspace.defaultNameDisplay`/`defaultShowFace` → `BUILTIN_DISPLAY_DEFAULT` fallback); the
  customer may choose **more privacy**; the submit action routes `{workspaceDefault, customerOverride}`
  through **`resolveDisplay`** (T7.1, the sole sanctioned write path) so the stored display is **never
  less private than the default**.
- **Rationale**: P-VII — it's the customer's likeness; the one-directional invariant must hold at the
  write. Enforcement is **server-side** (never trust the client's resolved value); the client UI only
  proposes an override.
- **P-V note**: if screen 04 doesn't depict the name/face control prominently, the control is still
  required (P-VII) and is placed faithfully within the consent screen — a documented decision, surfaced,
  not silent drift.

## R7 — Token lifecycle (72h expiry, single-use)

- **Decision**: `expiresAt = createdAt + 72h` (a config-overridable constant, e.g.
  `CAPTURE_TOKEN_TTL_HOURS = 72`). The **authoritative** access check is `status='open' AND
  expiresAt > now()` at consume/read time; a `status='expired'` value is a convenience, never the gate.
  Single-use = the conditional consume flips `status→'used'`.
- **Rationale**: matches screen 10 ("only stay open for a little while") and the resolved Q1; checking
  `expiresAt>now()` avoids relying on a sweeper to flip stale `status`. (A background expiry sweep is
  unnecessary this slice.)

## C1 — QR display (OPEN, blocking)

Runtime QR generation needs a dependency; the no-new-dep guard (11) conflicts. **Recommendation: A** —
**link-only** this slice (copyable `/c/[token]` URL on the dev surface), QR deferred to the merchant
request surface (T7.4) or T7.3. Option B (add a small QR lib) needs explicit P-III approval; C = custom.
Decide before `/speckit-tasks`.
