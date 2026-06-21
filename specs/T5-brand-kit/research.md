# Phase 0 — Research & Decisions: T5-BrandKit

Grounded in the codebase (B2's R2 path is the reuse anchor). No decision requires ratification (no new
dep, additive schema, byte-stable consumers). The two items to review are §1 (the partial-port honesty —
hidden vs faked) and §2 (the reused R2 logo path — no new dependency).

---

## §1 — The partial honest port: what is HIDDEN (not faked, not dead) and why

**Finding**: the reference brand-kit **editor (screen 12)** depicts far more than the honest,
buildable-now scope — it shows **light & dark logos, a brand colour + auto-contrast, a caption font, AND
also** per-format caption styles, a default music bed, B-roll cutaways, and a **"Live preview · reskins
live"** that restyles a real customer clip. Screen **11** is a **multi-kit list**; screen **12** is a
**per-kit editor at `/app/brand/[id]`**.

**Decision**: a **partial honest port** — port **logo + brand colour + fonts**; **omit** (render nothing,
not a disabled stub) the out-of-scope controls, each with a documented reason:

| Control | Disposition | Reason |
|---|---|---|
| "Live preview · reskins live" | **HIDDEN** | The **forbidden faked styled-clip preview** — replaced by the honest T8 seam label (FR-006). |
| Product media · B-roll cutaways | **HIDDEN** | **B2's footage store** (`/app/footage`, shipped) — not this slice. |
| Default music bed | **HIDDEN** | A render capability we don't have → **T8**. |
| Caption style · per format | **HIDDEN** | A render styling capability → **T8**. |
| Light & dark logos | **DEFERRED** | Single logo v1; light/dark is additive later. |
| Multi-kit list + `/app/brand/[id]` | **OUT (Q1:A)** | Single kit v1; multi-kit is additive UI later (multi-row schema, §3). |

**Rationale**: the port-completeness rule ("don't render pictured controls that can't work yet") + P-XII.
Hiding (not faking, not dead-stubbing) keeps A-11 honest — every control shown genuinely works; the only
deferred capability (styling a rendered clip) is the labeled T8 seam, not a fake.

**Alternatives rejected**: rendering disabled "coming soon" stubs for music/caption/B-roll — rejected as
clutter and a weaker honesty story than omission; faking a live-reskin preview — explicitly forbidden.

---

## §2 — The reused R2 logo path: no new dependency

**Decision**: the logo upload reuses **B2's exact presigned-PUT flow** (`src/lib/r2.ts` +
`src/app/app/footage/actions.ts` pattern):
1. `presignBrandKitLogoUpload({ contentType, sizeBytes })` — server **validates an image** type/size and
   signs a short-lived R2 PUT URL via `r2.ts` `presignPut` (which uses `aws4fetch`). Returns
   `{ status:'ok', uploadUrl, key } | { status:'invalid', reason }`.
2. The **browser PUTs the bytes directly to R2** (never through the server) — B2's transport.
3. On the browser's success, the kit persists `logoAssetUrl = assetUrlForKey(key)` via `saveBrandKit`.

`r2.ts` gains only a small additive `brandKitLogoKey(workspaceId)` helper; `presignPut` / `assetUrlForKey`
are **reused unchanged**. **No new dependency** (`aws4fetch` already present from B2); the **same R2 env +
CORS** provisioned for B2 cover brand-kit logos. The lazy `getConfig()` means the **build stays green
without R2 env** — a missing var only throws on a live presign (the upload walk).

**Image validation**: a **new image allowlist** (`image/png`, `image/jpeg`, `image/svg+xml`, `image/webp`)
+ a smaller size cap (logos are small — e.g. ~5 MB), mirroring B2's `ALLOWED_UPLOAD_TYPES` /
`MAX_UPLOAD_BYTES` pattern. The constants live in the **client-safe `src/lib/brand-kit.ts`** (like B2's
`brand-asset.ts`) so the widget validates client-side too; the presign action re-validates server-side
(never trust the client).

**Rationale**: matches the user's fence (reuse B2 exactly, no new dep); SVG is allowed but is a known XSS
vector if ever inlined — it is only ever shown via `<img src>` (not inlined), which is safe.

**Alternatives rejected**: a new upload mechanism / different storage — rejected (B2's path is proven and
provisioned); inlining SVG — rejected (XSS); base64-in-DB — rejected (R2 is the object store).

---

## §3 — The `brand_kit` table: additive, naturally multi-row (multi-kit is later additive UI)

**Decision**: a new `brand_kit` table, workspace-scoped, **no unique constraint on `workspaceId`** so the
table is naturally multi-row — promoting to **multiple kits later is additive UI, no migration**. v1
manages the workspace's **single** kit:
- `getBrandKit(workspaceId)` returns the workspace's one kit (the single existing row; `limit 1`, e.g.
  oldest) or `null`.
- `upsertBrandKit(...)` — if a row exists for the workspace, **update** it; else **insert** (a
  read-then-write upsert, since there's no unique key to `onConflict` against — and we deliberately avoid
  one to keep multi-kit open).

**Columns**: `id`, `workspaceId → workspace (cascade)`, `name text` (nullable), `logoAssetUrl text`
(nullable — null = no logo), `brandColor text` (hex), `fonts jsonb` (the curated picks), `createdAt`,
`updatedAt`.

**Rationale**: additive-only (migration `0003`, the first since B2's `0002`); the no-unique-constraint
choice is the explicit "multi-kit later, no migration" decision; no consent/proof linkage (owned data).

**Alternatives rejected**: a unique `workspaceId` index (enforces single but blocks multi-kit without a
migration) — rejected per the user's "naturally multi-row" instruction; a singleton key-value settings
blob — rejected (a typed table is the schema contract).

---

## §4 — Auto-contrast: DERIVED, not stored

**Decision**: store **one** `brandColor` hex; **derive** the readable contrast foreground at read/render
time via a pure `contrastOn(hex)` helper (relative luminance threshold → an on-token readable colour,
e.g. ink vs paper / white vs ink). Not a stored field.

**Rationale**: auto-contrast is a deterministic function of the brand colour — storing it would be
redundant and could drift; deriving keeps one source of truth and matches the reference's "auto-contrast
✓". Pure + client-safe (testable).

---

## §5 — Curated fonts (no upload)

**Decision**: `FONT_OPTIONS` = a fixed list of **renderable** families — the Pressroom set already loaded
via `next/font` (Fraunces, Hanken Grotesk, JetBrains Mono) plus any embed-licensed additions. The kit
stores the picks (e.g. a display role + a body/caption role); specimens render the real loaded fonts.
**No font-file upload** (Q2:A — avoids licensing + render-embedding).

**Rationale**: every option genuinely renders (A-11, real specimens); no licensing/file-handling burden.

---

## §6 — No dependency · additive schema · byte-stable (confirmations)

- **No new dependency**: reuses `aws4fetch` (B2) + Drizzle/Neon + the existing fonts.
- **Additive schema only**: the new `brand_kit` table (migration `0003`); no change to `proof` / `consent`
  / `derived_asset` / `brand_asset` or any read shape.
- **Byte-stable**: `ProofCard`, the proof / clip / showcase / consent reads, `generateClip`,
  `generateBatch`, the nav rail; `r2.ts` `presignPut`/`assetUrlForKey` reused unchanged (only an additive
  key helper).
- **Owned, consent-free**: never invokes consent (like B2).
- **Build green without R2 env**: lazy `getConfig()` — only the live upload needs R2.

---

## Resolved unknowns

| Unknown | Resolution |
|---|---|
| What to port vs hide | Port logo/colour/fonts; hide live-reskin (T8), B-roll (B2), music/caption (T8); single-kit (Q1:A) (§1). |
| New dependency for logo upload? | No — reuse B2's `aws4fetch` presigned-PUT path (§2). |
| Schema for single-now/multi-later | Additive `brand_kit`, no unique on workspaceId; v1 upsert the single row (§3). |
| Auto-contrast | Derived at read time from `brandColor` (not stored) (§4). |
| Fonts | Curated renderable set; no upload (§5). |
| Logo absent | Honest "no logo yet — upload one"; never a broken `<img>`; seed no logo (§1/§3). |
| New dep / schema scope / byte-stability | None / additive `brand_kit` only / consumers + rail unchanged (§6). |
