# Phase 1 — Data Model: T4-B4 Export

## Schema change: NONE (confirmed)

Export is **read + produce**. It introduces **no new table, column, enum, or migration**. The last
migration (`0002_*`, T4-B2 brand assets) is the latest; B4 adds nothing. Every field the post-text
package needs **already exists** on shipped tables:

| Package field | Source column (existing) | Table |
|---|---|---|
| clip id, format, hook, createdAt, assetUrl | `derived_asset.{id, format, hook, createdAt, assetUrl}` | `derived_asset` |
| customer headline | `proof.quote` ?? `proof.transcript` | `proof` |
| customer name, verified, proofType | `proof.{customerName, verified, proofType}` | `proof` |
| capture source label | `source.label` | `source` |
| proof id (identifier) | `derived_asset.proofId` / `proof.id` | — |

The consent gate is the **existing** shared `effectiveConsentGranted(proofIdColumn)` predicate
(`queries.ts`) — reused verbatim, no new consent structure.

## New read shape (additive — beside the byte-stable shapes)

`PostTextPackage` — defined in **new** `src/lib/export.ts` (client-safe; **type-only** schema imports,
exactly like `clip.ts` / `studio.ts`, so no Drizzle/runtime DB code reaches any bundle). Owned fields
only — **never** a view/reach/engagement/performance metric (FR-019).

```text
PostTextPackage {
  clipId:       string            // identifier
  proofId:      string            // identifier (and the source-proof link target)
  headline:     string | null     // the customer's VERBATIM proof (quote ?? transcript) — P-II centerpiece
  hook:         string | null     // brand-authored caption line (clearly the brand's words)
  customerName: string            // attribution
  verified:     boolean           // the "verified real customer" mark (attribution)
  source:       string            // capture source label (attribution / provenance)
  proofType:    ProofType         // context (text/video/photo/audio)
  format:       ClipFormat        // context
  createdAt:    string            // ISO date
  // the honest T8 video seam — an openly-labeled SAMPLE reference, NEVER a finished clip (Q2:A)
  sampleVideo:  { status: "arrives_at_T8"; note: string; reference: string /* SAMPLE_CLIP_URL */ }
}
```

**Relationship to existing shapes** (all **byte-unchanged** — FR-008):
- `ClipView`, `LibraryClipView`, `ClipDetailView` — untouched. `PostTextPackage` is a **new sibling**,
  not an extension that mutates them.
- It overlaps `ClipDetailView` on most fields but **adds `headline`** (the gap, research §3) and the
  structured `sampleVideo`, and **omits** the two consent-role fields (export does not surface
  provenance/gate metadata — that is the detail screen's job).

## Produced artifacts (not persisted)

Both are **derived at export time** from `PostTextPackage`; neither is stored:

- **Copy text (single)** — `formatPostText(pkg): string`, a pure on-token assembly:
  ```text
  {headline}                                   ← the customer's words first (P-II); omitted if null

  {hook}                                        ← the brand line; omitted if null
  — {customerName}{verified ? ", verified customer" : ""} · via {source}

  [sample — your rendered clip replaces this when rendering ships (T8). Not a finished clip.]
  ```
  Microcopy avoids "amazing"/"awesome" and emoji (P-XI). Exact wording in
  `contracts/post-text-package.md`.

- **Manifest (bulk)** — `buildManifest(pkgs: PostTextPackage[]): string` → JSON (research §2):
  ```text
  { "exportedAt": "<ISO, stamped by the action>", "count": <n>, "clips": [ PostTextPackage + { "postText": formatPostText(pkg) }, … ] }
  ```
  One file; `filename` like `weavova-export-<n>-clips.json`.

## State / transitions

None persisted. Transient UI state only (bulk selection): `selecting: boolean`, `selected:
Set<string>` — owned by the `LibraryClient` island, not a stored entity and not part of any read
shape (mirrors `InboxClient`'s batch-selection state).

## Validation rules

- **Consent (P-VII)**: a package is produced **only** for a clip whose source proof's **current**
  effective consent is `granted` (the shared gate in the read). Withdrawn → no package (single:
  `notFound` at render; bulk: absent → skipped).
- **Owned-only (FR-019)**: the package carries no metric; the video is only the labeled sample.
- **Headline absence**: `quote` and `transcript` both null (e.g. some photo proofs) → `headline:
  null`; the package still yields hook + attribution; never fabricated.
- **Workspace isolation**: every read is `workspaceId`-scoped (the established tenant property);
  cross-workspace ids return nothing (folded into the bulk "skipped", indistinguishable from
  withdrawn — the three-into-one opacity of `getClip`).
