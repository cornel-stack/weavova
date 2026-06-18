import { and, asc, desc, eq, sql, type AnyColumn } from "drizzle-orm";
import { getDb } from "./client";
import { withDbRetry } from "./with-retry";
import {
  brandAsset,
  consent,
  derivedAsset,
  proof,
  proofBrandAsset,
  source,
  workspace,
} from "./schema";
import {
  SAMPLE_CLIP_URL,
  type ClipDetailView,
  type ClipFormat,
  type ClipView,
  type LibraryClipView,
} from "@/lib/clip";
import type {
  BrandAssetKind,
  BrandAssetView,
  ProofBrandAssetView,
} from "@/lib/brand-asset";
import type { ConsentState, ProofDetailView, ProofView } from "@/lib/proof";
import type { ShowcaseItem } from "@/lib/showcase";

export type Workspace = typeof workspace.$inferSelect;

// The seeded demo workspace (oldest row). The session/workspace seam
// (src/lib/session.ts) wraps this; T6 replaces the seam with real auth.
// Cold-start hardened (T2.1) so the /app layout's workspace read survives a
// transient Neon wake-up; the seam itself is unchanged.
export async function getDefaultWorkspace(): Promise<Workspace | null> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select()
      .from(workspace)
      .orderBy(asc(workspace.createdAt))
      .limit(1);
    return rows[0] ?? null;
  });
}

// Effective consent = the latest version's state (correlated subquery), as one
// shared helper so the proof reads and the T2.4a derived-asset withdrawal filter
// use IDENTICAL logic (one source of truth — P-VII). A proof with no consent row
// yields null → a non-granted state (fails closed).
function effectiveConsentState(proofIdColumn: AnyColumn) {
  return sql<ConsentState | null>`(
  select c.state from ${consent} c
  where c.proof_id = ${proofIdColumn}
  order by c.version desc
  limit 1
)`;
}

// SQL predicate: the proof's effective consent is currently 'granted'. The T2.4a
// derived-asset reads apply this to WITHDRAW assets whose proof's consent is no
// longer granted (revoked/awaiting) — revocation is a new version, never a delete,
// so this read-time gate (not a DB cascade) is the P-VII enforcement.
function effectiveConsentGranted(proofIdColumn: AnyColumn) {
  return sql`${effectiveConsentState(proofIdColumn)} = 'granted'`;
}

// The proof reads use the shared helper bound to proof.id — identical generated SQL
// to the prior inline subquery (behaviour-preserving; ProofView/getProofs unchanged).
const latestConsentState = effectiveConsentState(proof.id);

const proofColumns = {
  id: proof.id,
  customerName: proof.customerName,
  proofType: proof.proofType,
  quote: proof.quote,
  transcript: proof.transcript,
  source: source.label,
  thumbnail: proof.thumbnail,
  capturedAt: proof.capturedAt,
  reviewed: proof.reviewed,
  verified: proof.verified,
  consentState: latestConsentState,
};

type ProofRow = {
  id: string;
  customerName: string;
  proofType: ProofView["proofType"];
  quote: string | null;
  transcript: string | null;
  source: string;
  thumbnail: string | null;
  capturedAt: Date;
  reviewed: boolean;
  verified: boolean;
  consentState: ConsentState | null;
};

function toView(row: ProofRow): ProofView {
  return {
    id: row.id,
    customerName: row.customerName,
    proofType: row.proofType,
    quote: row.quote,
    transcript: row.transcript,
    source: row.source,
    // no consent row → not granted (gate fails closed)
    consentState: row.consentState ?? "awaiting",
    thumbnail: row.thumbnail,
    capturedAt: row.capturedAt.toISOString(),
    reviewed: row.reviewed,
    verified: row.verified,
  };
}

// Workspace-scoped proof reads (the scoping deferred from T2.1, applied at T2.2).
// Both add `proof.workspaceId = $ws` to the existing projection and are wrapped in
// withDbRetry so a transient Neon cold start is retried transparently behind the
// inbox loading state. No schema/seed/seam/ProofView change — the T6 multi-tenant
// swap stays mechanical. See specs/T2.2-proof-inbox/contracts/queries-workspace-scoped.md.

// All proof in a workspace, newest first (the inbox Wall reads this once and
// filters/sorts/searches in memory; the dashboard uses its own summary read).
export async function getProofs(workspaceId: string): Promise<ProofView[]> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select(proofColumns)
      .from(proof)
      .innerJoin(source, eq(proof.sourceId, source.id))
      .where(eq(proof.workspaceId, workspaceId))
      .orderBy(desc(proof.capturedAt));
    return rows.map(toView);
  });
}

// ── Proof detail projection (T2.3) ──────────────────────────────────────────
// getProof returns ProofDetailView = ProofView + the effective (latest-version)
// consent's version + effective date, so the detail shows "granted · {date} · v{n}"
// faithfully. PROJECTION-ONLY: proofColumns/toView/latestConsentState/getProofs
// above are byte-unchanged; only getProof + these detail-scoped helpers carry the
// extra consent fields (owned data, never fabricated). No schema/seed change.
// See specs/T2.3-proof-detail/contracts/queries-proof-detail.md.

const latestConsentVersion = sql<number | string | null>`(
  select c.version from ${consent} c
  where c.proof_id = ${proof.id}
  order by c.version desc
  limit 1
)`;

// Effective consent date per state: granted → grantedAt, revoked → revokedAt,
// awaiting → createdAt (capture time). coalesce over the latest-version row.
const latestConsentEffectiveAt = sql<Date | string | null>`(
  select coalesce(c.revoked_at, c.granted_at, c.created_at) from ${consent} c
  where c.proof_id = ${proof.id}
  order by c.version desc
  limit 1
)`;

const detailColumns = {
  ...proofColumns,
  consentVersion: latestConsentVersion,
  consentEffectiveAt: latestConsentEffectiveAt,
};

type ProofDetailRow = ProofRow & {
  consentVersion: number | string | null;
  consentEffectiveAt: Date | string | null;
};

function toDetailView(row: ProofDetailRow): ProofDetailView {
  return {
    ...toView(row),
    consentVersion:
      row.consentVersion == null ? null : Number(row.consentVersion),
    consentAt:
      row.consentEffectiveAt == null
        ? null
        : new Date(row.consentEffectiveAt).toISOString(),
  };
}

// A single proof, scoped to the workspace: a proof from another workspace (or a
// non-existent id) resolves to null — the same result, with no other tenant's row
// ever projected. That null drives the detail's notFound() (US3 tenant isolation).
export async function getProof(
  workspaceId: string,
  id: string,
): Promise<ProofDetailView | null> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select(detailColumns)
      .from(proof)
      .innerJoin(source, eq(proof.sourceId, source.id))
      .where(and(eq(proof.workspaceId, workspaceId), eq(proof.id, id)))
      .limit(1);
    return rows[0] ? toDetailView(rows[0]) : null;
  });
}

// ============================================================================
// Dashboard read model (T2.1). The single workspace-scoped read the dashboard
// masthead/hero/grid consume. KPI numbers are COMPUTED here (never hardcoded in
// the UI); time windows use the real current date (DB now()). The clip-derived
// fields are honest placeholders until the derived_asset entity lands at T2.4 —
// see the `// T2.4:` markers below. No external view/engagement metric is ever
// part of this contract (Weavova owns none in v1).
// ============================================================================

/** A clip the merchant could feature later — owned descriptors only, no views. */
export type LatestClipDescriptor = {
  customerName: string;
  verified: boolean;
  createdAt: string; // ISO
};

export type DashboardSummary = {
  /** proof captured in the trailing 7 days (real now()) */
  proofThisWeek: number;
  /** proof not yet reviewed (also the greeting's "N to review" count) */
  needsReview: number;
  /** all proof in the workspace (discriminates the empty state) */
  totalProof: number;
  /** clips created this calendar month */
  clipsThisMonth: number;
  /** the most recent owned clip, or null when none exist */
  latestClip: LatestClipDescriptor | null;
  /** the most-recently-captured proof, shown large; null when no proof */
  heroProof: ProofView | null;
  /** the next most-recent proof after the hero (capped), hero excluded */
  recentProof: ProofView[];
};

// Screen 01 shows a 2×3 recent grid; the rest is reachable via the inbox (T2.2).
const RECENT_GRID_LIMIT = 6;

export async function getDashboardSummary(
  workspaceId: string,
): Promise<DashboardSummary> {
  return withDbRetry(async () => {
    const db = getDb();

    // Counts span ALL workspace proof (not just the fetched page). Windows use
    // the DB's real now() — never anchored to the newest proof (FR-004 / A-02).
    const [counts] = await db
      .select({
        totalProof: sql<number>`count(*)::int`,
        needsReview: sql<number>`(count(*) filter (where ${proof.reviewed} = false))::int`,
        proofThisWeek: sql<number>`(count(*) filter (where ${proof.capturedAt} >= now() - interval '7 days'))::int`,
      })
      .from(proof)
      .where(eq(proof.workspaceId, workspaceId));

    // Hero + recent in one ordered, limited fetch reusing the existing
    // projection. Element 0 = hero; the rest = the grid (hero excluded).
    const rows = await db
      .select(proofColumns)
      .from(proof)
      .innerJoin(source, eq(proof.sourceId, source.id))
      .where(eq(proof.workspaceId, workspaceId))
      .orderBy(desc(proof.capturedAt))
      .limit(RECENT_GRID_LIMIT + 1);

    const views = rows.map(toView);

    // Clips this calendar month (real now()), workspace-scoped, WITHDRAWN assets
    // excluded (the proof's effective consent must be granted — P-VII).
    const [clipCount] = await db
      .select({ clipsThisMonth: sql<number>`count(*)::int` })
      .from(derivedAsset)
      .where(
        and(
          eq(derivedAsset.workspaceId, workspaceId),
          sql`${derivedAsset.createdAt} >= date_trunc('month', now())`,
          effectiveConsentGranted(derivedAsset.proofId),
        ),
      );

    // The most recent non-withdrawn clip → owned descriptor only (no view metric).
    const latestClipRows = await db
      .select({
        customerName: proof.customerName,
        verified: proof.verified,
        createdAt: derivedAsset.createdAt,
      })
      .from(derivedAsset)
      .innerJoin(proof, eq(derivedAsset.proofId, proof.id))
      .where(
        and(
          eq(derivedAsset.workspaceId, workspaceId),
          effectiveConsentGranted(derivedAsset.proofId),
        ),
      )
      .orderBy(desc(derivedAsset.createdAt))
      .limit(1);
    const latest = latestClipRows[0];
    const latestClip: LatestClipDescriptor | null = latest
      ? {
          customerName: latest.customerName,
          verified: latest.verified,
          createdAt: latest.createdAt.toISOString(),
        }
      : null;

    return {
      proofThisWeek: counts?.proofThisWeek ?? 0,
      needsReview: counts?.needsReview ?? 0,
      totalProof: counts?.totalProof ?? 0,
      clipsThisMonth: clipCount?.clipsThisMonth ?? 0,
      latestClip,
      heroProof: views[0] ?? null,
      recentProof: views.slice(1, RECENT_GRID_LIMIT + 1),
    };
  });
}

// ============================================================================
// Generated-assets read (T2.4a). A proof's clips for the detail's "Generated
// assets" section — workspace-scoped, retry-hardened. WITHDRAWN assets are
// excluded: a clip whose proof's effective consent is not 'granted' (revoked/
// awaiting) is not returned (P-VII, read-time withdrawal). The row is retained in
// the table for audit. Owned fields only — never a view/engagement metric (FR-019).
// ============================================================================

export async function getProofClips(
  workspaceId: string,
  proofId: string,
): Promise<ClipView[]> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({
        id: derivedAsset.id,
        kind: derivedAsset.kind,
        format: derivedAsset.format,
        assetUrl: derivedAsset.assetUrl,
        hook: derivedAsset.hook,
        createdAt: derivedAsset.createdAt,
      })
      .from(derivedAsset)
      .where(
        and(
          eq(derivedAsset.workspaceId, workspaceId),
          eq(derivedAsset.proofId, proofId),
          effectiveConsentGranted(derivedAsset.proofId),
        ),
      )
      .orderBy(desc(derivedAsset.createdAt));

    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      format: row.format,
      assetUrl: row.assetUrl,
      hook: row.hook,
      createdAt: row.createdAt.toISOString(),
    }));
  });
}

// ============================================================================
// Clip studio writes (T2.4b). The Generate Server Action's consent re-check +
// the single-row insert. The proof reads + the T2.4a clip reads above are
// byte-unchanged; only these two functions are added.
// ============================================================================

// Consent re-check at generate (P-VII). Returns the GRANTED consent row's id for a
// proof — its PROVENANCE for the written clip — or null when the proof's effective
// consent is not 'granted'. Reuses the shared `effectiveConsentGranted`
// (→ effectiveConsentState), so the generate gate is IDENTICAL to T2.4a's read-time
// withdrawal gate (one source of truth). Workspace-scoped via the proof join: a
// cross-workspace or missing proofId yields null (no leak). withDbRetry-wrapped
// (a read — safe to retry). The latest version row is the effective one; the
// `effectiveConsentGranted` predicate guarantees that latest row's state is granted.
export async function getGrantedConsentId(
  workspaceId: string,
  proofId: string,
): Promise<{ consentId: string } | null> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({ consentId: consent.id })
      .from(consent)
      .innerJoin(proof, eq(consent.proofId, proof.id))
      .where(
        and(
          eq(proof.workspaceId, workspaceId),
          eq(proof.id, proofId),
          effectiveConsentGranted(proof.id),
        ),
      )
      .orderBy(desc(consent.version))
      .limit(1);
    return rows[0] ?? null;
  });
}

// Persist one generated clip (T2.4b — the app's first mutation). A SINGLE insert
// attempt — deliberately NOT withDbRetry-wrapped (D4): an insert has no natural
// unique key, so a blind retry on a transient error could double-write. The caller
// (the Generate action) re-checks consent first (getGrantedConsentId) and passes the
// granted consentId as provenance; assetUrl is the shared stubbed sample (D5).
export async function insertDerivedAsset(values: {
  workspaceId: string;
  proofId: string;
  consentId: string;
  format: ClipFormat;
  hook: string | null;
}): Promise<{ createdAt: Date }> {
  const [row] = await getDb()
    .insert(derivedAsset)
    .values({
      workspaceId: values.workspaceId,
      proofId: values.proofId,
      consentId: values.consentId,
      kind: "clip",
      format: values.format,
      assetUrl: SAMPLE_CLIP_URL,
      hook: values.hook,
    })
    .returning({ createdAt: derivedAsset.createdAt });
  return row;
}

// ============================================================================
// Library read (T3.1). ALL of the workspace's generated clips for the Library
// surface — workspace-scoped, newest-first, retry-hardened. WITHDRAWN assets are
// excluded by the SAME shared `effectiveConsentGranted` gate the dashboard/detail
// clip reads use (one source of truth — P-VII): a clip whose source proof's
// effective consent is not 'granted' is not returned; its row is retained for
// audit. Joins `proof` for the owned source context (customer, verified, link
// target). Owned fields only — never a view/engagement metric (FR-019). The proof
// reads and the T2.4a clip reads above are byte-unchanged; only this is added.
// ============================================================================

export async function getLibraryClips(
  workspaceId: string,
): Promise<LibraryClipView[]> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({
        id: derivedAsset.id,
        proofId: derivedAsset.proofId,
        customerName: proof.customerName,
        verified: proof.verified,
        kind: derivedAsset.kind,
        format: derivedAsset.format,
        assetUrl: derivedAsset.assetUrl,
        hook: derivedAsset.hook,
        createdAt: derivedAsset.createdAt,
      })
      .from(derivedAsset)
      .innerJoin(proof, eq(derivedAsset.proofId, proof.id))
      .where(
        and(
          eq(derivedAsset.workspaceId, workspaceId),
          effectiveConsentGranted(derivedAsset.proofId),
        ),
      )
      .orderBy(desc(derivedAsset.createdAt));

    return rows.map((row) => ({
      id: row.id,
      proofId: row.proofId,
      customerName: row.customerName,
      verified: row.verified,
      kind: row.kind,
      format: row.format,
      assetUrl: row.assetUrl,
      hook: row.hook,
      createdAt: row.createdAt.toISOString(),
    }));
  });
}

// ============================================================================
// Clip detail read (T3.2). A single clip's focused view by id — workspace-scoped
// and consent-withdrawal-GATED via the SHARED effectiveConsentGranted. Joins proof
// + source (provenance) + the MADE-UNDER consent row (via derived_asset.consentId)
// and reuses the existing current-effective-consent subqueries (the gate role).
//
// THREE-INTO-ONE NULL (no oracle): a missing id, a cross-workspace id, AND a
// withdrawn clip (source proof's effective consent not 'granted') ALL yield no row →
// null → the caller's one content-free notFound(). The viewer cannot tell which
// (T2.3 tenant-isolation property, extended to withdrawal — P-VII). Withheld rows
// are retained (read-time gate, not a delete). Owned fields only (FR-019). The proof
// reads + the T2.4a/T3.1 clip reads above are byte-unchanged; only this is added.
// ============================================================================

export async function getClip(
  workspaceId: string,
  clipId: string,
): Promise<ClipDetailView | null> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({
        id: derivedAsset.id,
        kind: derivedAsset.kind,
        format: derivedAsset.format,
        hook: derivedAsset.hook,
        assetUrl: derivedAsset.assetUrl,
        createdAt: derivedAsset.createdAt,
        proofId: derivedAsset.proofId,
        customerName: proof.customerName,
        proofType: proof.proofType,
        verified: proof.verified,
        source: source.label,
        // made-under provenance (the consent version the clip was generated under)
        madeUnderVersion: consent.version,
        madeUnderAt: consent.grantedAt,
        // current effective consent (the gate) — reuse the existing subqueries
        consentState: latestConsentState,
        consentVersion: latestConsentVersion,
        consentEffectiveAt: latestConsentEffectiveAt,
      })
      .from(derivedAsset)
      .innerJoin(proof, eq(derivedAsset.proofId, proof.id))
      .innerJoin(source, eq(proof.sourceId, source.id))
      .innerJoin(consent, eq(consent.id, derivedAsset.consentId))
      .where(
        and(
          eq(derivedAsset.id, clipId),
          eq(proof.workspaceId, workspaceId),
          effectiveConsentGranted(derivedAsset.proofId),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      kind: row.kind,
      format: row.format,
      hook: row.hook,
      assetUrl: row.assetUrl,
      createdAt: row.createdAt.toISOString(),
      proofId: row.proofId,
      customerName: row.customerName,
      proofType: row.proofType,
      verified: row.verified,
      source: row.source,
      madeUnderVersion: Number(row.madeUnderVersion),
      madeUnderAt: row.madeUnderAt
        ? new Date(row.madeUnderAt).toISOString()
        : null,
      // gate guarantees granted when a row is returned; coalesce defensively
      consentState: row.consentState ?? "granted",
      consentVersion:
        row.consentVersion == null ? null : Number(row.consentVersion),
      consentAt:
        row.consentEffectiveAt == null
          ? null
          : new Date(row.consentEffectiveAt).toISOString(),
    };
  });
}

// ============================================================================
// Showcase read (T-Showcase). The workspace's "wall of proof" — BOTH consented
// proof and clips, consent-withdrawal-FILTERED via the SHARED effectiveConsentGranted
// (visibility identical to the dashboard/Library — P-VII), merged newest-first.
//
// IMPORTANT: this is DISTINCT from getProofs, which is intentionally UNFILTERED (the
// inbox shows all consent states). The Showcase shows only GRANTED — so it is its own
// consented-proof query (reusing proofColumns/toView read-only), NOT a change to
// getProofs. Clips reuse getLibraryClips (already withdrawal-filtered). Owned fields
// only — verified is a mark, not a gate (FR-019). Existing reads are byte-unchanged.
// ============================================================================

export async function getShowcase(
  workspaceId: string,
): Promise<ShowcaseItem[]> {
  const [proofs, clips] = await Promise.all([
    // consented proof — same projection as the inbox (proofColumns/toView), but
    // GATED on granted consent (unlike getProofs). Newest-first by capture date.
    withDbRetry(async () => {
      const rows = await getDb()
        .select(proofColumns)
        .from(proof)
        .innerJoin(source, eq(proof.sourceId, source.id))
        .where(
          and(
            eq(proof.workspaceId, workspaceId),
            effectiveConsentGranted(proof.id),
          ),
        )
        .orderBy(desc(proof.capturedAt));
      return rows.map(toView);
    }),
    // consented clips — reuse the existing withdrawal-filtered read unchanged.
    getLibraryClips(workspaceId),
  ]);

  const items: ShowcaseItem[] = [
    ...proofs.map((p): ShowcaseItem => ({ kind: "proof", proof: p })),
    ...clips.map((c): ShowcaseItem => ({ kind: "clip", clip: c })),
  ];

  // Newest-first across both kinds. ISO date strings compare lexicographically =
  // chronologically; proof uses capturedAt, clip uses createdAt.
  items.sort((a, b) => {
    const aDate = a.kind === "proof" ? a.proof.capturedAt : a.clip.createdAt;
    const bDate = b.kind === "proof" ? b.proof.capturedAt : b.clip.createdAt;
    return bDate.localeCompare(aDate);
  });

  return items;
}

// ============================================================================
// Brand-asset store (T4-B2). The brand's OWN reusable footage + the many-to-many
// proof attach. These sit ENTIRELY OUTSIDE the consent model (P-VII): a brand
// asset is owned footage, not customer proof — no consent join, no effective-
// consent gate. The clip-generation gate (getGrantedConsentId) is UNCHANGED and
// remains the SOLE gate; nothing here touches it. Owned fields only — a brand
// asset is never counted as, or returned as, customer proof (FR-019).
//
// Reads are withDbRetry-wrapped (safe to retry). Writes are SINGLE-ATTEMPT (D4 —
// not retry-wrapped; a blind retry on a transient error could double-write).
// ============================================================================

// The reusable store list — all of the workspace's owned brand assets, newest
// first (brand_asset_ws_created_idx). Owned footage, never proof (FR-019).
export async function getBrandAssets(
  workspaceId: string,
): Promise<BrandAssetView[]> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({
        id: brandAsset.id,
        kind: brandAsset.kind,
        label: brandAsset.label,
        assetUrl: brandAsset.assetUrl,
        createdAt: brandAsset.createdAt,
      })
      .from(brandAsset)
      .where(eq(brandAsset.workspaceId, workspaceId))
      .orderBy(desc(brandAsset.createdAt));

    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      label: row.label,
      assetUrl: row.assetUrl,
      createdAt: row.createdAt.toISOString(),
    }));
  });
}

// The brand assets ATTACHED to one proof (join ⨝ brand_asset), newest-attached
// first — for the proof detail's additive "Attached brand assets" section. NO
// consent gate (attaching owned footage is consent-free; the proof's own consent
// still governs clip generation elsewhere, unchanged). Separate read so getProof /
// getProofClips and their view shapes stay byte-stable.
export async function getProofBrandAssets(
  workspaceId: string,
  proofId: string,
): Promise<ProofBrandAssetView[]> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({
        attachmentId: proofBrandAsset.id,
        attachedAt: proofBrandAsset.createdAt,
        id: brandAsset.id,
        kind: brandAsset.kind,
        label: brandAsset.label,
        assetUrl: brandAsset.assetUrl,
        createdAt: brandAsset.createdAt,
      })
      .from(proofBrandAsset)
      .innerJoin(brandAsset, eq(proofBrandAsset.brandAssetId, brandAsset.id))
      .where(
        and(
          eq(proofBrandAsset.workspaceId, workspaceId),
          eq(proofBrandAsset.proofId, proofId),
        ),
      )
      .orderBy(desc(proofBrandAsset.createdAt));

    return rows.map((row) => ({
      attachmentId: row.attachmentId,
      attachedAt: row.attachedAt.toISOString(),
      id: row.id,
      kind: row.kind,
      label: row.label,
      assetUrl: row.assetUrl,
      createdAt: row.createdAt.toISOString(),
    }));
  });
}

// Persist one owned brand asset AFTER the browser's direct PUT to R2 succeeds
// (T4-B2). SINGLE attempt (D4 — not retry-wrapped). No consent involvement.
export async function createBrandAsset(values: {
  workspaceId: string;
  kind: BrandAssetKind;
  label: string;
  assetUrl: string;
}): Promise<BrandAssetView> {
  const [row] = await getDb()
    .insert(brandAsset)
    .values({
      workspaceId: values.workspaceId,
      kind: values.kind,
      label: values.label,
      assetUrl: values.assetUrl,
    })
    .returning({
      id: brandAsset.id,
      kind: brandAsset.kind,
      label: brandAsset.label,
      assetUrl: brandAsset.assetUrl,
      createdAt: brandAsset.createdAt,
    });
  return {
    id: row.id,
    kind: row.kind,
    label: row.label,
    assetUrl: row.assetUrl,
    createdAt: row.createdAt.toISOString(),
  };
}

// Attach a brand asset to a proof (T4-B2). IDEMPOTENT via the (proofId,
// brandAssetId) unique index: a duplicate attach does nothing and reports
// "already_attached". Workspace-scoped (the caller verifies both ids belong to the
// workspace). SINGLE attempt (D4). No consent check — owned footage is consent-free.
export async function attachBrandAsset(values: {
  workspaceId: string;
  proofId: string;
  brandAssetId: string;
}): Promise<{ status: "attached" | "already_attached" }> {
  const inserted = await getDb()
    .insert(proofBrandAsset)
    .values({
      workspaceId: values.workspaceId,
      proofId: values.proofId,
      brandAssetId: values.brandAssetId,
    })
    .onConflictDoNothing({
      target: [proofBrandAsset.proofId, proofBrandAsset.brandAssetId],
    })
    .returning({ id: proofBrandAsset.id });
  return inserted.length > 0
    ? { status: "attached" }
    : { status: "already_attached" };
}

// Detach a brand asset from a proof (T4-B2, Q2:A) — delete the JOIN ROW ONLY. The
// brand asset and any other proof's attachment are untouched. Workspace-scoped.
// SINGLE attempt (D4). Delete-from-store is a conscious deferral (no asset delete).
export async function detachBrandAsset(values: {
  workspaceId: string;
  proofId: string;
  brandAssetId: string;
}): Promise<void> {
  await getDb()
    .delete(proofBrandAsset)
    .where(
      and(
        eq(proofBrandAsset.workspaceId, values.workspaceId),
        eq(proofBrandAsset.proofId, values.proofId),
        eq(proofBrandAsset.brandAssetId, values.brandAssetId),
      ),
    );
}
