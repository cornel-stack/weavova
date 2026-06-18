# Quickstart / Validation — T4-B2 Brand-asset store

Manual validation that the slice meets its acceptance criteria. (No unit-test runner; verification = build +
these checks.) **Prereq for the live-upload checks: research.md §1 ratified (transport + dep) and R2 env +
bucket CORS configured.** The build/byte-stability checks run without any of that.

## Prerequisites

- `npm install` (after the one ratified dep is added — research.md §1b).
- Schema applied: `npx drizzle-kit generate` then `npx drizzle-kit migrate` (needs `DATABASE_URL`).
- Seed includes sample owned brand assets + a couple of attachments: `npm run db:seed`.
- R2 (for live upload): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
  `R2_PUBLIC_BASE_URL` in `.env.local`; bucket CORS allows `PUT` from `http://localhost:3000`.
- `npm run dev`.

## Build & byte-stability (no DB/R2 creds needed)

1. `npm run typecheck` — green. The R2 client constructs **lazily** (like `getDb()`), so missing creds don't
   break typecheck/build.
2. `npm run lint` — green.
3. `npm run build` — green **without** `DATABASE_URL` and **without** R2 creds.
4. **One new dependency**: `git diff package.json` shows exactly the single ratified R2/SigV4 dep (or none, if
   hand-rolled) — nothing else (SC-010).
5. **Additive migration**: the generated `drizzle/0002_*.sql` contains only `CREATE TYPE/TABLE` + indexes — no
   `ALTER`/`DROP` on existing tables (SC-007).

## US1 — Upload into the reusable store (real R2)

6. Open the store route; with an empty store, an honest empty state + an upload affordance show (no fake/sample
   asset).
7. Upload a valid `.mp4`: observe `uploading` (progress) → `stored`; a labeled owned asset appears, clearly the
   **brand's own footage** (kind chip `product`/`broll` + label), **not** the verified-customer mark, **not** a
   proof framing. Reload → it persists. Confirm the object is actually in the R2 bucket (SC-001, SC-005).
8. Upload a disallowed type (e.g. a `.pdf`/`.txt`) → rejected with an honest reason **before** any R2 write; no
   asset row; control recovers (SC-002).
9. Upload an oversize file (> MAX_BYTES) → rejected client-side before requesting a presign; nothing stored.
10. Simulate a failed PUT (e.g. revoke CORS / kill network mid-upload) → honest `failed` state, retryable, not
    shown as stored (FR-004).

## US2 — Attach / detach (many-to-many)

11. On proof A (granted), open the additive **"Attached brand assets"** section → attach an asset from the
    store → it appears, framed as **supporting context**, persists on reload (SC-003).
12. Attach the **same** asset to proof B → both attachments exist independently (one asset → many proofs).
    Attach a **second** asset to proof A → one proof → many assets.
13. Re-attach the same asset to proof A → **no duplicate** row (idempotent / "already attached") (SC-003).
14. **Detach** the asset from proof A → removed from A only; the asset still in the store and still attached to
    B (SC-003, Q2:A). Confirm **no** delete-from-store control exists (deferred).

## US3 — Honest T8 seam

15. With assets attached to a granted proof, the section states honestly the asset **"will appear in the
    rendered clip when rendering ships (T8)"** — an explicit deferred label; **no** combined/composited preview
    anywhere (SC-004, FR-007).
16. Generate a clip from that proof (studio) → the result is the **same honest sample/preview** as before; the
    attached asset is **not** composited in (generateClip byte-unchanged) (SC-004).

## US4 — Consent stays the sole gate (P-VII)

17. Attach an asset to a proof whose effective consent is **not granted** → the attach **succeeds** (owned
    footage) and **no customer-consent prompt/row** is created (SC-006).
18. Try to generate a clip for that non-granted proof (studio / batch) → **blocked** exactly as today (the
    `getGrantedConsentId` gate), asset attached or not → **0** clips (SC-006).
19. Withdraw a granted proof that has attachments → the existing withdrawal/cascade behavior over
    `derived_asset` + read-time filters is **unchanged**; the attachment rows are irrelevant to the gate.

## FR-019 — never proof

20. Confirm brand assets appear in **0** proof counts, the proof inbox, and the showcase proof set; they are
    only in the store + the proof-detail attached section, always labeled owned (SC-005).

## States & a11y

21. Empty (no assets / nothing attached), loading (skeleton), error (upload `failed`; genuine read failure →
    shared `<ErrorState>`) all present and on-token.
22. Keyboard: choose file, upload, attach (picker), detach, dismiss — all operable with visible focus;
    responsive at ≤480 / 1024 / 1280 (+1240 max) (SC-008).

## Out-of-scope confirmation (A-11 / P-VIII)

23. **0** out-of-scope controls render: no editor/timeline/trim/compositor; no T5 brand-kit styling; no
    customer-proof upload (design-reference B2); no warmth/export; no delete-from-store; no fake composite
    (SC-009).
