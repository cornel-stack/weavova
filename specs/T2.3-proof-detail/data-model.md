# Phase 1 — Data Model: T2.3 Proof Detail (read model only)

**No database schema change.** The detail reads the existing T0.3 tables through the query layer. The
"model" added here is (a) a **detail-only read projection** `ProofDetailView` (a superset of the shared
`ProofView`) and (b) two pure UI predicates (`hasMedia`, the consent gate). Nothing new is stored.

## Existing entities used (T0.3, unchanged)

- **workspace** — scope; resolved by the seam (`getCurrentWorkspace`). The detail reads only
  `proof.workspaceId = ws.id` (the tenant-isolation boundary).
- **proof** — `customerName`, `proofType` (text/video/photo/audio), `quote`/`transcript`, `sourceId`,
  `capturedAt`, `reviewed`, `verified`, `thumbnail` (media ref; **null in all fixtures**), `workspaceId`.
- **consent** — versioned; `state`, `grantedAt`, `revokedAt`, `createdAt`, `version`. The **latest version**
  is the effective consent; its state + version + effective date drive the consent panel and the clip gate.
- **source** — `label` (Shopify, Stripe, …) shown in the metadata panel.
- **ProofView** (`src/lib/proof.ts`) — the flattened shared shape; **reused unchanged** as the base of the
  detail projection.

## Added read projection: `ProofDetailView` (superset of `ProofView`)

| Field | Source | Notes |
|---|---|---|
| …all `ProofView` fields | unchanged `proofColumns` + `toView` | `id`, `customerName`, `proofType`, `quote`, `transcript`, `source`, `consentState`, `thumbnail`, `capturedAt`, `reviewed`, `verified` |
| `consentVersion: number \| null` | latest consent row's `version` (correlated subquery) | the effective consent version ("v{n}"); null only if a proof has no consent row (defensive — none in fixtures) |
| `consentAt: string \| null` | `coalesce(revokedAt, grantedAt, createdAt)` of the latest consent row → ISO | **granted → grantedAt**, **revoked → revokedAt**, **awaiting → createdAt**; labelled by `consentState` in the UI |

- Built in `getProof` only (`detailColumns` + `toDetailView`). The shared `proofColumns`, `toView`, and
  `getProofs` are **not** changed — the inbox/card/styleguide keep `ProofView`.
- `getProof(workspaceId, id): Promise<ProofDetailView | null>` — adds the two consent fields to the T2.2
  scoped+retry-wrapped read. Return type refined from `ProofView` (no existing caller; superset, so safe).

## UI derivations (pure, presentation-side)

| Derivation | Rule |
|---|---|
| **`hasMedia(proof)`** | `proof.thumbnail != null` (and the proof is a media type). False for every current fixture → the media region renders nothing (Q1/FR-009). Forward-compatible: real media (T7/T8) sets the ref → region renders. |
| **consent gate** | `proof.consentState === "granted"` → asset-deriving actions ("Make a clip", "Carousel", "Embed") are rendered; otherwise hidden. "Ask this customer for more" is not gated (P-VII, FR-006). |
| **content (the headline)** | `transcript` (media proofs) or `quote` (text proofs) — the largest, warmest element (P-II), consistent with the ProofCard/T2.2. |
| **consent label** | by `consentState`: "Consent granted · {consentAt} · v{consentVersion}" / "Consent revoked · {consentAt} · v{consentVersion}" / "Awaiting consent · v{consentVersion}" (date optional for awaiting). |

## Tenant isolation (the trust boundary)

- `getProof` filters on **both** `workspaceId` and `id`. A missing id and a cross-workspace id both yield
  `null` — there is no projection or path that returns another workspace's proof row. The page maps `null`
  → `notFound()` → one honest not-found state (no existence oracle; see `contracts/detail-states.md`).

## Not modeled (carry-over honesty)

- **Warmth / sentiment** — backs screen 03's "Glowing · NN/100 warmth" panel; not in the schema, **not
  rendered** (FR-008/019; real signal = T4/B3).
- **Derived assets / clips** — back "Generated assets · N" and the format makers; the entity arrives at
  T2.4/T8; **no count or asset is fabricated** (FR-016a).
- **Activity log** — not modelled; the "Activity" tab is **not rendered**.
- **Product / variant, capture-channel phrasing** — not owned columns; **omitted** (FR-017).
- **Consent version history** — the full multi-version "Record" disclosure is **deferred** (only the
  effective version/date are shown).

## Forward-compatibility

- `ProofDetailView` extends `ProofView`, so when real media / a richer consent history land, the projection
  grows without reshaping the shared contract; the T6 multi-tenant swap stays mechanical (already reads one
  workspace via the seam).
