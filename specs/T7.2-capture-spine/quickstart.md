# Quickstart — Capture spine verification

No test runner (P-III). Verification = `typecheck`/`lint`/`build` green + a walk of the seeded request
through `/c/[token]` (video + text) + the owner-surface integration check. Run from repo root.

## Prerequisites

- `.env.local` with `DATABASE_URL` (Neon) + the R2 env (the B2 vars, reused).
- Migrations `0006` (enum + capture_request + verification_basis) **and** `0007` (additive
  `proof.media_url` for captured video, Increment 2) generated + applied; seed run.

## 1. Migrate + seed

```bash
npm run db:generate     # emits drizzle/0006_*.sql (enum + capture_request + verification_basis)
                        # + drizzle/0007_*.sql (additive proof.media_url, Increment 2)
npm run db:migrate      # apply (IPv4-first if needed: node --dns-result-order=ipv4first ...)
npm run db:seed         # adds a 'link' source + a few capture_requests (open / expired / used)
```

**Expected**: `0006` + `0007` are additive (no existing table/column changed). Seed prints the
seeded request tokens.

## 2. Build green

```bash
npm run typecheck && npm run lint && npm run build
```

## 3. Resolve a token + open the public page

- Get an **open** request token (seed output, or the dev-only `styleguide/data` link list).
- Open `http://localhost:3000/c/<open-token>` on a **mobile viewport**.

**Expected**: the **prompt (01)** renders in the workspace **brand** (logo/colour), addresses the
customer by name, shows **all four** options; **video + text** are wired; **photo + audio** show an
honest **"coming"** state (not dead). No `/app` chrome, no login.

## 4. Video path (01 → 02 → 03 → 04 → 05 → 06)

- Tap "Record a quick video" → record (02) → review (03, "Looks good? … retake") → consent (04) →
  "Send to {brand}" → sending (05) → thank-you (06).

**Expected**: the video uploads **directly to R2** (the app server never receives the bytes — check the
network tab: the PUT goes to the R2 host). After send: a real **video proof** + a real **granted consent
version** (`useScope = ['organic']`) + a **verification_basis** with `transaction_verified_at = null`.
The request flips to **used**.

## 5. Text path (01 → 07 → 04 → 05 → 06)

- Open a second **open** token → "Write it" (07) → type words → consent → send → thank-you.

**Expected**: a real **text proof** whose stored words are **byte-identical** to what was typed (0
alteration). Empty/whitespace text is **rejected** (no empty proof).

## 6. Consent invariants (P-VII)

- Confirm the written consent version has **`useScope = ['organic']`** only (no paid/showcase/embed).
- On screen 04, pick a **more-private** name/face option → confirm the stored display is that
  more-private value. Try (conceptually) a less-private value → the server clamps to the workspace
  default (it never stores less private than the default — `resolveDisplay`).
- Confirm **no "Verified real" stamp** anywhere in the flow.

## 7. Single-use + expiry (honest block)

- Re-open the **used** token → honest **"already used"** block; **no second proof** can be written.
- Open the **expired** token → honest **"expired"** block (minimal; polished screen 10 → T7.2b).
- Open an **unknown** token → honest not-found block (no workspace leak, no 500).

## 8. Owner-surface integration (FR-015 — the zero-edit check)

In the authenticated app (the demo owner), confirm the **capture-written proof** appears through the
**existing reads, unedited**:

- **Inbox** (`/app/proof`) — the new proof shows as an **unreviewed** card, source label "Capture link".
- **Dashboard** (`/app`) — counts/recent reflect it.
- **Proof detail** (`/app/proof/[id]`) — opens; consent **granted**; words/media shown.
- **Consent ledger** (`/app/consent`) — the new granted version appears.
- **Studio** — generate is allowed (organic-consented); the existing gate passes.

**If any of these required a code edit to render the captured proof, that is a P-V violation — STOP and
surface it.** Expectation: **0 edits**.

## Done when

- `0006` + `0007` applied (additive); seed adds the link source + requests.
- `typecheck` + `lint` + `build` green.
- Video + text paths each produce a real proof + granted organic consent + a basis stub
  (`transaction_verified_at` null); bytes never hit the app server.
- Single-use + expiry blocks honest; no second proof; no 500.
- The captured proof renders in inbox/dashboard/detail/ledger with **0** owner-surface edits.
- **0** verified stamps shown.
