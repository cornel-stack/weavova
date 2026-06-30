import { and, asc, desc, eq, gt, inArray, sql, type AnyColumn } from "drizzle-orm";
import { getDb } from "./client";
import { withDbRetry } from "./with-retry";
import {
  brandAsset,
  brandKit,
  captureRequest,
  consent,
  derivedAsset,
  proof,
  proofBrandAsset,
  requestSend,
  requestTemplate,
  source,
  verificationBasis,
  webhookEndpoint,
  webhookEvent,
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
import { proofIsVerified, verificationState } from "@/lib/verification";
import type { ShowcaseItem } from "@/lib/showcase";
import { sampleVideoRef, type PostTextPackage } from "@/lib/export";
import {
  BUILTIN_DISPLAY_DEFAULT,
  CONSENT_PURPOSE,
  type ConsentDisplay,
  type ConsentLedgerEntry,
  type ConsentScope,
  type ConsentVersionEntry,
  type NameDisplay,
  type ProofConsentClip,
} from "@/lib/consent";
import {
  CAPTURE_COMING_PATHS,
  CAPTURE_TOKEN_TTL_HOURS,
  CAPTURE_WIRED_PATHS,
  type CaptureRequestView,
  type CaptureResolution,
} from "@/lib/capture";
import type { ProofType } from "@/lib/proof";
import type { BrandKitFonts, BrandKitView } from "@/lib/brand-kit";
import type {
  RequestChannel,
  RequestTrigger,
  TemplateCardView,
} from "@/lib/requests";

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

// T7.1 — the FAILS-CLOSED scope gate (the T9 forward-contract). True iff the proof's
// EFFECTIVE (latest) consent is granted AND its use_scope contains `scope`. Built on the
// same latest-version subselect as effectiveConsentGranted; the GIN index on use_scope
// serves the `@>` containment (no per-row JSON parse). The trailing `is true` coerces a
// missing row / null (no consent) → FALSE — a non-granted or scope-absent consent denies
// in SQL, not just app logic. T9 uses this to express "only clips whose consent grants
// scope X" as one indexed WHERE predicate.
function effectiveConsentGrantsScope(
  proofIdColumn: AnyColumn,
  scope: ConsentScope,
) {
  return sql`(
  select c.state = 'granted' and c.use_scope @> array[${scope}]::consent_scope[]
  from ${consent} c
  where c.proof_id = ${proofIdColumn}
  order by c.version desc
  limit 1
) is true`;
}

// The proof reads use the shared helper bound to proof.id — identical generated SQL
// to the prior inline subquery (behaviour-preserving; ProofView/getProofs unchanged).
const latestConsentState = effectiveConsentState(proof.id);

// T7.5 — the transaction leg of the verified resolver, as a correlated EXISTS predicate
// (mirrors effectiveConsentState's shape). The verified BAR: a basis only counts if its
// strength is strong|medium AND it carries a confirmed transaction_verified_at — so a
// merchant's weak assertion, or a malformed strong row with no confirmation, can NEVER
// over-claim (FR-019). Surfaced as the internal row field `hasQualifyingBasis`; the verified
// boolean is produced ONLY by proofIsVerified (the chokepoint — proof.verified is unread).
function qualifyingBasisExpr(proofIdColumn: AnyColumn) {
  return sql<boolean>`(
  exists (
    select 1 from ${verificationBasis} b
    where b.proof_id = ${proofIdColumn}
      and b.strength in ('strong', 'medium')
      and b.transaction_verified_at is not null
  )
)`;
}

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
  // T7.5 — the resolver INPUT, not the verified truth. proof.verified is no longer selected;
  // toView derives `verified` from consent + this basis leg via proofIsVerified (the chokepoint).
  hasQualifyingBasis: qualifyingBasisExpr(proof.id),
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
  hasQualifyingBasis: boolean;
  consentState: ConsentState | null;
};

function toView(row: ProofRow): ProofView {
  // no consent row → not granted (gate fails closed)
  const consentState = row.consentState ?? "awaiting";
  return {
    id: row.id,
    customerName: row.customerName,
    proofType: row.proofType,
    quote: row.quote,
    transcript: row.transcript,
    source: row.source,
    consentState,
    thumbnail: row.thumbnail,
    capturedAt: row.capturedAt.toISOString(),
    reviewed: row.reviewed,
    // T7.5 — the SOLE verified-state read (consent AND basis; short-circuits on consent).
    verified: proofIsVerified({
      consentState,
      hasQualifyingBasis: row.hasQualifyingBasis,
    }),
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

// Clip status per proof (T4-B3) — the proofIds in the workspace that have ≥1 derived
// clip ("tapped"). The un-tapped warmth signal's input — the ONE owned fact not on
// ProofView. ADDITIVE: getProofs/ProofView and every other read are byte-unchanged;
// this returns a plain id list (the client builds a Set for O(1) lookups). NOT
// consent-filtered — "tapped" is a provenance fact (a clip was made from this proof);
// withdrawn proof is ranked cold by warmth's consent gate regardless. Fired ONLY on
// opt-in to Warmest (via the getInboxClipStatus action), never on the default path.
export async function getProofClipStatus(
  workspaceId: string,
): Promise<string[]> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .selectDistinct({ proofId: derivedAsset.proofId })
      .from(derivedAsset)
      .where(eq(derivedAsset.workspaceId, workspaceId));
    return rows.map((row) => row.proofId);
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

// T7.1 — the ConsentDisplay payload of the EFFECTIVE (latest) version, as sibling
// subselects mirroring latestConsentVersion exactly (same latest-version-wins
// resolution). ADDITIVE: the helpers above are byte-unchanged; these are NEW and are
// consumed only by the new getEffectiveConsentDisplay read (no existing surface reads
// them, so every FR-010 consumer stays byte-stable).
const latestConsentScope = sql<ConsentScope[] | null>`(
  select c.use_scope from ${consent} c
  where c.proof_id = ${proof.id}
  order by c.version desc
  limit 1
)`;
const latestConsentNameDisplay = sql<NameDisplay | null>`(
  select c.name_display from ${consent} c
  where c.proof_id = ${proof.id}
  order by c.version desc
  limit 1
)`;
const latestConsentShowFace = sql<boolean | null>`(
  select c.show_face from ${consent} c
  where c.proof_id = ${proof.id}
  order by c.version desc
  limit 1
)`;

const detailColumns = {
  ...proofColumns,
  consentVersion: latestConsentVersion,
  consentEffectiveAt: latestConsentEffectiveAt,
  // T7.2 — detail-only: the captured media key (null for text + fixtures). Added ONLY to
  // the detail projection; proofColumns/getProofs/ProofView stay byte-unchanged.
  mediaUrl: proof.mediaUrl,
};

type ProofDetailRow = ProofRow & {
  consentVersion: number | string | null;
  consentEffectiveAt: Date | string | null;
  mediaUrl: string | null;
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
    mediaUrl: row.mediaUrl ?? null,
    // T7.5 — the richer three-state read for the detail's in-between label. SAME inputs as
    // `verified` (consent + basis), via the SAME resolver — never re-derived ad hoc.
    verificationState: verificationState({
      consentState: row.consentState ?? "awaiting",
      hasQualifyingBasis: row.hasQualifyingBasis,
    }),
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
        hasQualifyingBasis: qualifyingBasisExpr(proof.id),
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
          // T7.5 — verified via the resolver; the WHERE gate guarantees granted consent.
          verified: proofIsVerified({
            consentState: "granted",
            hasQualifyingBasis: latest.hasQualifyingBasis,
          }),
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
//
// T7.1 — the return is WIDENED ADDITIVELY to carry the granted version's ConsentDisplay
// payload (useScope + resolved nameDisplay/showFace). Existing callers read only
// `.consentId` and are byte-stable (the generate gate, recordConsentWithdrawal); the new
// fields are available for the generate path / verified bar later. Display nulls fall back
// to BUILTIN_DISPLAY_DEFAULT (the read-side coalesce; the workspace default is applied at
// write via resolveDisplay — by the granted version's stored value here).
export async function getGrantedConsentId(
  workspaceId: string,
  proofId: string,
): Promise<{
  consentId: string;
  useScope: ConsentScope[];
  nameDisplay: NameDisplay;
  showFace: boolean;
} | null> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({
        consentId: consent.id,
        useScope: consent.useScope,
        nameDisplay: consent.nameDisplay,
        showFace: consent.showFace,
      })
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
    const row = rows[0];
    if (!row) return null;
    return {
      consentId: row.consentId,
      useScope: row.useScope ?? [],
      nameDisplay: row.nameDisplay ?? BUILTIN_DISPLAY_DEFAULT.nameDisplay,
      showFace: row.showFace ?? BUILTIN_DISPLAY_DEFAULT.showFace,
    };
  });
}

// T7.1 — getEffectiveConsentDisplay: the clean entry point downstream slices (T7.2
// capture form, the verified bar) consume to render a clip exactly as the customer
// chose. Returns the EFFECTIVE (latest) version's resolved { useScope, nameDisplay,
// showFace }, or null when the proof has no consent row. Workspace-scoped via the proof
// join (no cross-workspace leak). Display nulls fall back through BUILTIN_DISPLAY_DEFAULT
// (the stored value is already privacy-resolved at write via resolveDisplay). NOT called
// by any existing surface in this slice — every FR-010 consumer stays byte-stable.
export async function getEffectiveConsentDisplay(
  workspaceId: string,
  proofId: string,
): Promise<ConsentDisplay | null> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({
        useScope: latestConsentScope,
        nameDisplay: latestConsentNameDisplay,
        showFace: latestConsentShowFace,
        hasConsent: sql<boolean>`exists (select 1 from ${consent} c where c.proof_id = ${proof.id})`,
      })
      .from(proof)
      .where(and(eq(proof.workspaceId, workspaceId), eq(proof.id, proofId)))
      .limit(1);
    const row = rows[0];
    if (!row || !row.hasConsent) return null;
    return {
      useScope: row.useScope ?? [],
      nameDisplay: row.nameDisplay ?? BUILTIN_DISPLAY_DEFAULT.nameDisplay,
      showFace: row.showFace ?? BUILTIN_DISPLAY_DEFAULT.showFace,
    };
  });
}

// T7.1 — consentGrantsScope: the imperative form of the fails-closed scope gate (the SQL
// predicate effectiveConsentGrantsScope, surfaced as an async boolean for channel checks).
// Returns false for missing / cross-workspace / non-granted / scope-absent; true only when
// the effective granted version's use_scope contains `scope`. T9 distribution gates
// channels on this (e.g. an organic-only clip cannot be used in a paid campaign).
export async function consentGrantsScope(
  workspaceId: string,
  proofId: string,
  scope: ConsentScope,
): Promise<boolean> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({ grants: effectiveConsentGrantsScope(proof.id, scope) })
      .from(proof)
      .where(and(eq(proof.workspaceId, workspaceId), eq(proof.id, proofId)))
      .limit(1);
    return rows[0]?.grants === true;
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
        hasQualifyingBasis: qualifyingBasisExpr(proof.id),
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
      // T7.5 — verified via the resolver; the WHERE gate guarantees granted consent.
      verified: proofIsVerified({
        consentState: "granted",
        hasQualifyingBasis: row.hasQualifyingBasis,
      }),
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
        hasQualifyingBasis: qualifyingBasisExpr(proof.id),
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
      // T7.5 — verified via the resolver; the gate guarantees granted, coalesce defensively.
      verified: proofIsVerified({
        consentState: row.consentState ?? "granted",
        hasQualifyingBasis: row.hasQualifyingBasis,
      }),
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

// ============================================================================
// Export reads (T4-B4). The owned POST-TEXT package a clip leaves the app as —
// the demo loop's payoff. ADDITIVE: getClip/getLibraryClips and their view shapes
// (ClipDetailView/LibraryClipView) are byte-unchanged; these are NEW projections
// beside them. Each carries the customer's VERBATIM proof (quote ?? transcript) —
// the headline (P-II) — which the existing clip reads do NOT project.
//
// CONSENT (P-VII): both reuse the SHARED `effectiveConsentGranted` predicate — the
// SAME gate the dashboard/Library/detail use. A withdrawn / missing / cross-workspace
// clip yields no row (the three-into-one no-oracle opacity of getClip). No new gate.
// The video is NEVER a finished clip here — sampleVideoRef() is the labeled T8 seam
// (FR-019 / Q2:A). The select uses the existing derived_asset ⨝ proof ⨝ source join.
// ============================================================================

const exportColumns = {
  clipId: derivedAsset.id,
  proofId: derivedAsset.proofId,
  format: derivedAsset.format,
  hook: derivedAsset.hook,
  createdAt: derivedAsset.createdAt,
  customerName: proof.customerName,
  hasQualifyingBasis: qualifyingBasisExpr(proof.id),
  proofType: proof.proofType,
  quote: proof.quote,
  transcript: proof.transcript,
  source: source.label,
};

type ExportRow = {
  clipId: string;
  proofId: string;
  format: ClipFormat;
  hook: string | null;
  createdAt: Date;
  customerName: string;
  hasQualifyingBasis: boolean;
  proofType: ProofView["proofType"];
  quote: string | null;
  transcript: string | null;
  source: string;
};

function toPostTextPackage(row: ExportRow): PostTextPackage {
  return {
    clipId: row.clipId,
    proofId: row.proofId,
    // the customer's VERBATIM words — quote ?? transcript; null when neither exists
    // (e.g. some photo proofs) — never fabricated (P-II / FR-002).
    headline: row.quote ?? row.transcript ?? null,
    hook: row.hook,
    customerName: row.customerName,
    // T7.5 — verified via the resolver; the export read is consent-gated (granted guaranteed).
    verified: proofIsVerified({
      consentState: "granted",
      hasQualifyingBasis: row.hasQualifyingBasis,
    }),
    source: row.source,
    proofType: row.proofType,
    format: row.format,
    createdAt: row.createdAt.toISOString(),
    sampleVideo: sampleVideoRef(),
  };
}

// One clip's post-text package by id — workspace-scoped + consent-withdrawal GATED
// via the shared effectiveConsentGranted. Returns null for missing / cross-workspace
// / withdrawn (no oracle). Used to assemble the single-export copy text at clip-detail
// render (the page is already consent-gated, so this is the same-gated companion).
export async function getClipExport(
  workspaceId: string,
  clipId: string,
): Promise<PostTextPackage | null> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select(exportColumns)
      .from(derivedAsset)
      .innerJoin(proof, eq(derivedAsset.proofId, proof.id))
      .innerJoin(source, eq(proof.sourceId, source.id))
      .where(
        and(
          eq(derivedAsset.id, clipId),
          eq(proof.workspaceId, workspaceId),
          effectiveConsentGranted(derivedAsset.proofId),
        ),
      )
      .limit(1);

    const row = rows[0];
    return row ? toPostTextPackage(row) : null;
  });
}

// Many clips' post-text packages by id — the BULK export read. Same join + the SAME
// shared gate; returns ONLY the granted, in-workspace clips among `clipIds`, newest
// first. The difference (requested − returned) is the honest SKIPPED set the
// exportClips action reports (withdrawn / missing / cross-workspace, indistinguishable
// by design). This is the consent RE-READ at action time — the B1 generateBatch race
// applied to a read: a clip granted at select but withdrawn before export is absent.
export async function getClipExports(
  workspaceId: string,
  clipIds: string[],
): Promise<PostTextPackage[]> {
  if (clipIds.length === 0) return [];
  return withDbRetry(async () => {
    const rows = await getDb()
      .select(exportColumns)
      .from(derivedAsset)
      .innerJoin(proof, eq(derivedAsset.proofId, proof.id))
      .innerJoin(source, eq(proof.sourceId, source.id))
      .where(
        and(
          inArray(derivedAsset.id, clipIds),
          eq(proof.workspaceId, workspaceId),
          effectiveConsentGranted(derivedAsset.proofId),
        ),
      )
      .orderBy(desc(derivedAsset.createdAt));

    return rows.map(toPostTextPackage);
  });
}

// ============================================================================
// Consent surface reads + the record-withdrawal write (T5-Consent). The consent
// model has gated every surface all session; this gives it a surface of its own.
// ADDITIVE: the shared helpers (effectiveConsentState / latestConsentState /
// latestConsentVersion / latestConsentEffectiveAt / getGrantedConsentId) and EVERY
// consuming read are byte-unchanged; these are NEW siblings. The write appends a new
// EXISTING-SHAPE consent row (a new revoked version) — no schema change, no new gate.
// ============================================================================

// The consent ledger — one row per proof with its CURRENT effective state, REUSING
// the existing latestConsentState/Version/EffectiveAt helpers (the getProof helpers —
// byte-stable). Lists ALL proofs/states (the status chips filter client-side).
export async function getConsentLedger(
  workspaceId: string,
): Promise<ConsentLedgerEntry[]> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({
        proofId: proof.id,
        customerName: proof.customerName,
        state: latestConsentState,
        currentVersion: latestConsentVersion,
        effectiveAt: latestConsentEffectiveAt,
      })
      .from(proof)
      .where(eq(proof.workspaceId, workspaceId))
      .orderBy(desc(proof.capturedAt));

    return rows.map((row) => ({
      proofId: row.proofId,
      customerName: row.customerName,
      purpose: CONSENT_PURPOSE,
      // no consent row → not granted (gate fails closed), like toView
      state: row.state ?? "awaiting",
      currentVersion:
        row.currentVersion == null ? null : Number(row.currentVersion),
      effectiveAt:
        row.effectiveAt == null
          ? null
          : new Date(row.effectiveAt).toISOString(),
    }));
  });
}

// Per-proof FULL retained version timeline (Q3:A) — ALL consent rows for the proof,
// version asc. Superseded/withdrawn versions are SHOWN, never erased (P-VII "pull,
// don't destroy"). Workspace-scoped via the proof join.
export async function getConsentHistory(
  workspaceId: string,
  proofId: string,
): Promise<ConsentVersionEntry[]> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({
        version: consent.version,
        state: consent.state,
        effectiveAt: sql<Date | string | null>`coalesce(${consent.revokedAt}, ${consent.grantedAt}, ${consent.createdAt})`,
      })
      .from(consent)
      .innerJoin(proof, eq(consent.proofId, proof.id))
      .where(and(eq(proof.workspaceId, workspaceId), eq(consent.proofId, proofId)))
      .orderBy(asc(consent.version));

    return rows.map((row) => ({
      version: Number(row.version),
      state: row.state,
      effectiveAt:
        row.effectiveAt == null
          ? null
          : new Date(row.effectiveAt).toISOString(),
    }));
  });
}

// THE SHARED READ — the proof's clips with their made-under consent version. Powers
// BOTH the cascade-preview N (= result.length) and the made-under provenance list
// (Q1 ∩ Q2). Proof-level cascade: withdrawing the proof's consent withholds ALL its
// clips, so this list IS the set the withdrawal will withhold. Workspace-scoped.
export async function getProofConsentClips(
  workspaceId: string,
  proofId: string,
): Promise<ProofConsentClip[]> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({
        clipId: derivedAsset.id,
        format: derivedAsset.format,
        madeUnderVersion: consent.version,
        createdAt: derivedAsset.createdAt,
      })
      .from(derivedAsset)
      .innerJoin(consent, eq(derivedAsset.consentId, consent.id))
      .where(
        and(
          eq(derivedAsset.workspaceId, workspaceId),
          eq(derivedAsset.proofId, proofId),
        ),
      )
      .orderBy(desc(derivedAsset.createdAt));

    return rows.map((row) => ({
      clipId: row.clipId,
      format: row.format,
      madeUnderVersion: Number(row.madeUnderVersion),
      createdAt: row.createdAt.toISOString(),
    }));
  });
}

// Record a customer's withdrawal — append a NEW withdrawn version through the EXISTING
// model (never a delete/update; prior versions RETAINED). Re-checks current grant
// first (reuse getGrantedConsentId — the shared gate): a non-granted proof is an
// honest no-op (no second version). version = max(version)+1. SINGLE attempt (D4 —
// the unique (proofId, version) index guards a double write). This RECORDS the
// customer's withdrawal; there is NO re-grant write.
export async function recordConsentWithdrawal(
  workspaceId: string,
  proofId: string,
): Promise<{ status: "recorded" | "not_granted"; version?: number }> {
  // Re-check CURRENT effective grant at write time (the established gate).
  const granted = await getGrantedConsentId(workspaceId, proofId);
  if (!granted) return { status: "not_granted" };

  const maxRows = await getDb()
    .select({ max: sql<number | string>`max(${consent.version})` })
    .from(consent)
    .where(eq(consent.proofId, proofId));
  const nextVersion = Number(maxRows[0]?.max ?? 0) + 1;

  await getDb().insert(consent).values({
    proofId,
    state: "revoked",
    revokedAt: new Date(),
    version: nextVersion,
  });

  return { status: "recorded", version: nextVersion };
}

// ============================================================================
// Brand kit reads + write (T5-BrandKit). The workspace's OWNED visual identity —
// no consent involvement (like brand_asset). ADDITIVE: every existing read/table is
// byte-unchanged; these are NEW siblings over the new brand_kit table. Auto-contrast
// is DERIVED in the UI (contrastOn) — never stored. v1 manages the single row; the
// table is naturally multi-row (no unique on workspaceId) so multi-kit is later
// additive UI.
// ============================================================================

function toBrandKitView(row: {
  id: string;
  name: string | null;
  logoAssetUrl: string | null;
  brandColor: string;
  fonts: unknown;
}): BrandKitView {
  return {
    id: row.id,
    name: row.name,
    logoAssetUrl: row.logoAssetUrl,
    brandColor: row.brandColor,
    fonts: row.fonts as BrandKitFonts,
  };
}

// The workspace's single brand kit (limit 1); null when none exists yet.
export async function getBrandKit(
  workspaceId: string,
): Promise<BrandKitView | null> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({
        id: brandKit.id,
        name: brandKit.name,
        logoAssetUrl: brandKit.logoAssetUrl,
        brandColor: brandKit.brandColor,
        fonts: brandKit.fonts,
      })
      .from(brandKit)
      .where(eq(brandKit.workspaceId, workspaceId))
      .orderBy(asc(brandKit.createdAt))
      .limit(1);

    const row = rows[0];
    return row ? toBrandKitView(row) : null;
  });
}

// Upsert the workspace's single kit — UPDATE the existing row (+ updatedAt) if one
// exists, else INSERT. Read-then-write (no onConflict/unique key — kept open for
// multi-kit). Single-attempt write (no blind retry). NO consent reference.
export async function upsertBrandKit(
  workspaceId: string,
  input: {
    name: string | null;
    logoAssetUrl: string | null;
    brandColor: string;
    fonts: BrandKitFonts;
  },
): Promise<BrandKitView> {
  const db = getDb();
  const existing = await db
    .select({ id: brandKit.id })
    .from(brandKit)
    .where(eq(brandKit.workspaceId, workspaceId))
    .orderBy(asc(brandKit.createdAt))
    .limit(1);

  const values = {
    name: input.name,
    logoAssetUrl: input.logoAssetUrl,
    brandColor: input.brandColor,
    fonts: input.fonts,
  };

  const returning = {
    id: brandKit.id,
    name: brandKit.name,
    logoAssetUrl: brandKit.logoAssetUrl,
    brandColor: brandKit.brandColor,
    fonts: brandKit.fonts,
  };

  if (existing[0]) {
    const rows = await db
      .update(brandKit)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(brandKit.id, existing[0].id))
      .returning(returning);
    return toBrandKitView(rows[0]);
  }

  const rows = await db
    .insert(brandKit)
    .values({ workspaceId, ...values })
    .returning(returning);
  return toBrandKitView(rows[0]);
}

// ============================================================================
// Capture (T7.2) — the request primitive + the public, TOKEN-SCOPED reads/writes
// for /c/[token]. These NEVER resolve identity from a session (no getCurrentWorkspace);
// the TOKEN is the capability. ADDITIVE: no existing read/table is touched. The send
// write-path writes a proof shaped IDENTICALLY to the fixtures (source kind 'link'), a
// REAL granted T7.1 consent version (organic-only, display via resolveDisplay), and a
// verification-basis STUB — so the existing owner reads render captured proof unchanged.
// ============================================================================

// Create a capture request: a per-request, single-use, 72h-expiring token (T006).
// `sourceId` is the workspace's `link` capture source. Server-generated token + expiry.
export async function createCaptureRequest(
  workspaceId: string,
  sourceId: string,
  opts: {
    customerName?: string | null;
    customerEmail?: string | null; // T7.3 — the Email-path recipient (additive)
    transactionRef?: string | null;
    // T7.4 — ADDITIVE: the webhook's transaction-evidence marker. When present (the caller
    // signalled a confirmed transaction), it is written to capture_request and later drives
    // the MEDIUM verification_basis at proof-write (writeCapturedProof). The token model
    // (token/72h/single-use) is UNCHANGED — this is one extra nullable column.
    transactionVerifiedAt?: Date | null;
  } = {},
): Promise<{ id: string; token: string; expiresAt: Date }> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + CAPTURE_TOKEN_TTL_HOURS * 60 * 60 * 1000,
  );
  const [row] = await getDb()
    .insert(captureRequest)
    .values({
      workspaceId,
      sourceId,
      token,
      customerName: opts.customerName ?? null,
      customerEmail: opts.customerEmail ?? null,
      transactionRef: opts.transactionRef ?? null,
      transactionVerifiedAt: opts.transactionVerifiedAt ?? null,
      status: "open",
      expiresAt,
    })
    .returning({ id: captureRequest.id });
  return { id: row.id, token, expiresAt };
}

// T7.3 — the workspace's `link` capture source id (the channel a /c/[token] proof is sourced
// from). Workspace-scoped; created at seed. Returns null if the workspace has no link source.
export async function getLinkSourceId(
  workspaceId: string,
): Promise<string | null> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({ id: source.id })
      .from(source)
      .where(and(eq(source.workspaceId, workspaceId), eq(source.kind, "link")))
      .limit(1);
    return rows[0]?.id ?? null;
  });
}

// ============================================================================
// T7.4 — the generic inbound webhook's data layer. The endpoint secret REALLY
// authenticates (P-XIII): a high-entropy token → the workspace the mint attributes to.
// All webhook-minted requests/proofs source from a per-workspace `webhook` source.
// ============================================================================

// A high-entropy, URL-safe webhook secret (256 bits via the WebCrypto global — no new
// dependency, app stays 11 deps). The `whsec_` prefix is a readable marker, not a secret.
function generateWebhookSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `whsec_${b64}`;
}

// Constant-time string equality — no early-exit on the first differing byte (secrets are
// fixed-length, so the length pre-check leaks nothing). Pure JS → runtime-agnostic.
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// Get-or-create the workspace's `webhook` source (the channel webhook mints attribute to).
// One per workspace; idempotent (get-first). Ensured when the endpoint is created.
export async function ensureWebhookSource(
  workspaceId: string,
): Promise<string> {
  return withDbRetry(async () => {
    const existing = await getDb()
      .select({ id: source.id })
      .from(source)
      .where(
        and(eq(source.workspaceId, workspaceId), eq(source.kind, "webhook")),
      )
      .limit(1);
    if (existing[0]) return existing[0].id;
    const [row] = await getDb()
      .insert(source)
      .values({ workspaceId, kind: "webhook", label: "Webhook" })
      .returning({ id: source.id });
    return row.id;
  });
}

// Get-or-create the workspace's ONE webhook endpoint, returning the REAL secret + the
// webhook source id. The secret is shown on the honest config surface (T009) and is the
// live authenticator (P-XIII — not decorative). Idempotent: an existing endpoint is
// returned unchanged (regeneration is a future explicit action, not implicit here).
export async function getOrCreateWebhookEndpoint(
  workspaceId: string,
): Promise<{ secret: string; sourceId: string }> {
  return withDbRetry(async () => {
    const existing = await getDb()
      .select({
        secret: webhookEndpoint.secret,
        sourceId: webhookEndpoint.sourceId,
      })
      .from(webhookEndpoint)
      .where(eq(webhookEndpoint.workspaceId, workspaceId))
      .limit(1);
    if (existing[0]) return existing[0];

    const sourceId = await ensureWebhookSource(workspaceId);
    const secret = generateWebhookSecret();
    const [row] = await getDb()
      .insert(webhookEndpoint)
      .values({ workspaceId, sourceId, secret })
      // a concurrent create wins the unique(workspace_id) — fall through to read it back
      .onConflictDoNothing({ target: webhookEndpoint.workspaceId })
      .returning({
        secret: webhookEndpoint.secret,
        sourceId: webhookEndpoint.sourceId,
      });
    if (row) return row;

    const after = await getDb()
      .select({
        secret: webhookEndpoint.secret,
        sourceId: webhookEndpoint.sourceId,
      })
      .from(webhookEndpoint)
      .where(eq(webhookEndpoint.workspaceId, workspaceId))
      .limit(1);
    return after[0];
  });
}

// The webhook's auth lookup: secret → workspace + webhook source. Unique-index lookup +
// a constant-time compare of the stored secret against the presented one. Returns null
// for a missing/unknown secret (the route maps null → a GENERIC 401, no disclosure).
export async function getWorkspaceBySecret(
  secret: string,
): Promise<{ workspaceId: string; sourceId: string } | null> {
  if (!secret) return null;
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({
        workspaceId: webhookEndpoint.workspaceId,
        sourceId: webhookEndpoint.sourceId,
        secret: webhookEndpoint.secret,
      })
      .from(webhookEndpoint)
      .where(eq(webhookEndpoint.secret, secret))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    if (!constantTimeEqual(row.secret, secret)) return null;
    return { workspaceId: row.workspaceId, sourceId: row.sourceId };
  });
}

// The idempotency ledger READ: has this (workspace, event_key) already minted? Returns the
// prior mint's request id + token (the duplicate-replay path returns the SAME capture_url —
// no second mint), or null for a first-seen event. Left-joins capture_request so a replay
// resolves its /c/[token] without a second query.
export async function findWebhookEvent(
  workspaceId: string,
  eventKey: string,
): Promise<{ captureRequestId: string | null; token: string | null } | null> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({
        captureRequestId: webhookEvent.captureRequestId,
        token: captureRequest.token,
      })
      .from(webhookEvent)
      .leftJoin(
        captureRequest,
        eq(webhookEvent.captureRequestId, captureRequest.id),
      )
      .where(
        and(
          eq(webhookEvent.workspaceId, workspaceId),
          eq(webhookEvent.eventKey, eventKey),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  });
}

// The idempotency ledger WRITE: record that this (workspace, event_key) minted a request.
// onConflictDoNothing on the unique(workspace_id, event_key) makes a concurrent duplicate a
// no-op rather than an error (the unique index is the real exactly-once guard).
export async function recordWebhookEvent(
  workspaceId: string,
  eventKey: string,
  captureRequestId: string,
): Promise<void> {
  await getDb()
    .insert(webhookEvent)
    .values({ workspaceId, eventKey, captureRequestId })
    .onConflictDoNothing({
      target: [webhookEvent.workspaceId, webhookEvent.eventKey],
    });
}

// T7.3 — record one DISPATCH of a request (email or link). One row per send; powers the honest
// per-request delivery state (C5) and the template "N sent" aggregate. Additive — never touches
// the capture_request token model.
export async function recordSend(input: {
  requestId: string;
  workspaceId: string;
  channel: "email" | "link";
  templateId?: string | null;
  recipientEmail?: string | null;
  deliveryStatus: "accepted" | "failed" | "link_generated";
  providerId?: string | null;
}): Promise<void> {
  await getDb().insert(requestSend).values({
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    channel: input.channel,
    templateId: input.templateId ?? null,
    recipientEmail: input.recipientEmail ?? null,
    deliveryStatus: input.deliveryStatus,
    providerId: input.providerId ?? null,
  });
}

// T7.3 (US2, ref 05) — the workspace's saved request templates with a REAL "N sent" aggregate
// (count of request_send rows referencing each template; P-XIV — never a fabricated number).
// Workspace-scoped (two-layer with the middleware gate). Newest first.
export async function listRequestTemplates(
  workspaceId: string,
): Promise<TemplateCardView[]> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({
        id: requestTemplate.id,
        name: requestTemplate.name,
        prompt: requestTemplate.prompt,
        triggerType: requestTemplate.triggerType,
        deliveryChannel: requestTemplate.deliveryChannel,
        sendTiming: requestTemplate.sendTiming,
        sentCount: sql<number>`count(${requestSend.id})`.mapWith(Number),
      })
      .from(requestTemplate)
      .leftJoin(requestSend, eq(requestSend.templateId, requestTemplate.id))
      .where(eq(requestTemplate.workspaceId, workspaceId))
      .groupBy(requestTemplate.id)
      .orderBy(desc(requestTemplate.createdAt));
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      prompt: r.prompt,
      triggerType: r.triggerType as RequestTrigger,
      deliveryChannel: r.deliveryChannel as RequestChannel,
      sendTiming: r.sendTiming,
      sentCount: r.sentCount,
    }));
  });
}

// T7.3 (US3, ref 06) — persist a reusable request template (the builder's "Save template").
// Workspace-scoped. The action layer enforces that only `manual_link` is saved this slice
// (automated triggers are honest "coming" — D5); this writer is trigger-agnostic.
export async function insertRequestTemplate(input: {
  workspaceId: string;
  name: string;
  prompt: string;
  triggerType: RequestTrigger;
  deliveryChannel: RequestChannel;
  sendTiming?: string | null;
  consentLine: string;
  consentVersion: string;
}): Promise<{ id: string }> {
  const [row] = await getDb()
    .insert(requestTemplate)
    .values({
      workspaceId: input.workspaceId,
      name: input.name,
      prompt: input.prompt,
      triggerType: input.triggerType,
      deliveryChannel: input.deliveryChannel,
      sendTiming: input.sendTiming ?? null,
      consentLine: input.consentLine,
      consentVersion: input.consentVersion,
    })
    .returning({ id: requestTemplate.id });
  return { id: row.id };
}

// PUBLIC token resolution (T007) — token → request → workspace → brand. Returns a
// discriminated result; NO workspace identifiers leak on a bad token. Authoritative
// expiry is `expires_at > now()` (a stale status never grants access). withDbRetry
// (a read). Calls getBrandKit (hoisted) — no session anywhere.
export async function getCaptureRequestByToken(
  token: string,
): Promise<CaptureResolution> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({
        workspaceId: captureRequest.workspaceId,
        customerName: captureRequest.customerName,
        status: captureRequest.status,
        expiresAt: captureRequest.expiresAt,
        workspaceName: workspace.name,
        defaultNameDisplay: workspace.defaultNameDisplay,
        defaultShowFace: workspace.defaultShowFace,
      })
      .from(captureRequest)
      .innerJoin(workspace, eq(captureRequest.workspaceId, workspace.id))
      .where(eq(captureRequest.token, token))
      .limit(1);

    const row = rows[0];
    if (!row) return { status: "not_found" };
    if (row.status === "used") return { status: "used" };
    if (new Date(row.expiresAt).getTime() <= Date.now())
      return { status: "expired" };

    const kit = await getBrandKit(row.workspaceId);
    const view: CaptureRequestView = {
      token,
      customerName: row.customerName,
      workspaceName: row.workspaceName,
      brand: kit
        ? {
            logoAssetUrl: kit.logoAssetUrl,
            brandColor: kit.brandColor,
            fonts: { display: kit.fonts.display, body: kit.fonts.body },
          }
        : null,
      display: {
        nameDisplay: row.defaultNameDisplay ?? BUILTIN_DISPLAY_DEFAULT.nameDisplay,
        showFace: row.defaultShowFace ?? BUILTIN_DISPLAY_DEFAULT.showFace,
      },
      wiredPaths: CAPTURE_WIRED_PATHS,
      comingPaths: CAPTURE_COMING_PATHS,
    };
    return { status: "ok", request: view };
  });
}

// The workspace's display DEFAULT (the server-owned privacy FLOOR for the capture
// write-path). The customer's override may only move MORE private than this; the action
// reads this server-side (never trusts the client floor) and feeds it to resolveDisplay.
export async function getWorkspaceDisplayDefault(
  workspaceId: string,
): Promise<{ nameDisplay: NameDisplay; showFace: boolean }> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({
        nameDisplay: workspace.defaultNameDisplay,
        showFace: workspace.defaultShowFace,
      })
      .from(workspace)
      .where(eq(workspace.id, workspaceId))
      .limit(1);
    const row = rows[0];
    return {
      nameDisplay: row?.nameDisplay ?? BUILTIN_DISPLAY_DEFAULT.nameDisplay,
      showFace: row?.showFace ?? BUILTIN_DISPLAY_DEFAULT.showFace,
    };
  });
}

// NON-consuming resolution of an OPEN token's workspace + source (T7.2 — presign needs
// this BEFORE the send consumes the token). Returns null for used/expired/unknown. The
// authoritative check is `status='open' AND expires_at > now()`. Token-scoped (no session).
export async function getOpenCaptureContext(
  token: string,
): Promise<{ workspaceId: string; sourceId: string } | null> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({
        workspaceId: captureRequest.workspaceId,
        sourceId: captureRequest.sourceId,
      })
      .from(captureRequest)
      .where(
        and(
          eq(captureRequest.token, token),
          eq(captureRequest.status, "open"),
          gt(captureRequest.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  });
}

// The ATOMIC single-use guard (T008) — one conditional UPDATE. Flips open→used iff the
// token is currently open AND unexpired, returning the request context; else null. This
// is the concurrency control (like the (proofId,version) unique guard): a second submit
// on a consumed/expired token gets null. NOT withDbRetry-wrapped — a blind retry of a
// consuming write is unsafe (D4 precedent).
export async function consumeCaptureToken(token: string): Promise<{
  requestId: string;
  workspaceId: string;
  sourceId: string;
  customerName: string | null;
  transactionRef: string | null;
} | null> {
  const rows = await getDb()
    .update(captureRequest)
    .set({ status: "used", usedAt: new Date() })
    .where(
      and(
        eq(captureRequest.token, token),
        eq(captureRequest.status, "open"),
        gt(captureRequest.expiresAt, new Date()),
      ),
    )
    .returning({
      requestId: captureRequest.id,
      workspaceId: captureRequest.workspaceId,
      sourceId: captureRequest.sourceId,
      customerName: captureRequest.customerName,
      transactionRef: captureRequest.transactionRef,
    });
  return rows[0] ?? null;
}

// The capture send write-path (T018). Token already consumed by consumeCaptureToken;
// this writes the three rows in ONE db.batch (neon-http has no interactive txn) with
// client-generated UUIDs so dependent ids are known. proof is FIXTURE-SHAPED; consent
// is a REAL granted T7.1 version (organic-only; display already resolved via
// resolveDisplay by the caller); verification_basis is a STUB (transaction leg null).
// All-or-nothing: a batch failure writes nothing (no partial/orphan proof).
export async function writeCapturedProof(input: {
  workspaceId: string;
  sourceId: string;
  requestId: string;
  customerName: string;
  proofType: ProofType;
  quote: string | null;
  transcript: string | null;
  mediaUrl: string | null; // T7.2 — captured source-media R2 key (video); null for text
  display: { nameDisplay: NameDisplay; showFace: boolean };
}): Promise<{ proofId: string }> {
  const proofId = crypto.randomUUID();
  const consentId = crypto.randomUUID();
  const basisId = crypto.randomUUID();
  const now = new Date();

  // T7.4 — the basis branch. Read the request's transaction evidence by requestId (so the
  // /c/[token] route/action stays UNTOUCHED — FR-014/FR-017, no caller change). The webhook
  // sets capture_request.transaction_verified_at when the caller signalled a confirmed
  // transaction; that presence is the discriminator:
  //   • transaction_verified_at present → a MEDIUM, source=webhook basis → the T7.5 resolver
  //     (UNCHANGED) lights the "Verified real" stamp via the forward contract (qualifyingBasisExpr
  //     already counts strength in (strong,medium) + a non-null transaction_verified_at).
  //   • absent (the live link/manual path) → a WEAK, source=manual basis: a merchant ASSERTION,
  //     not a system confirmation — stays BELOW the bar (FR-019), shows the honest in-between.
  const [reqRow] = await getDb()
    .select({
      transactionRef: captureRequest.transactionRef,
      transactionVerifiedAt: captureRequest.transactionVerifiedAt,
    })
    .from(captureRequest)
    .where(eq(captureRequest.id, input.requestId))
    .limit(1);
  const hasTransactionEvidence = reqRow?.transactionVerifiedAt != null;

  await getDb().batch([
    getDb().insert(proof).values({
      id: proofId,
      workspaceId: input.workspaceId,
      customerName: input.customerName,
      proofType: input.proofType,
      quote: input.quote,
      transcript: input.transcript,
      sourceId: input.sourceId,
      capturedAt: now,
      reviewed: false,
      // T7.5 — proof.verified WRITE-FROZEN (retired-in-place): not written; defaults false.
      // Verified-state is DERIVED by the resolver from consent + the weak basis below (→ false).
      thumbnail: null, // poster is T8; the captured media key lives in mediaUrl
      mediaUrl: input.mediaUrl,
    }),
    getDb().insert(consent).values({
      id: consentId,
      proofId,
      state: "granted",
      grantedAt: now,
      version: 1,
      useScope: ["organic"], // least-privilege (P-VII)
      nameDisplay: input.display.nameDisplay,
      showFace: input.display.showFace,
      captureContext: { method: "capture_page", requestId: input.requestId },
    }),
    getDb().insert(verificationBasis).values({
      id: basisId,
      proofId,
      requestId: input.requestId,
      consentCapturedAt: now, // the consent leg — REAL
      // T7.4 — the transaction leg, graded by the request's evidence (above). Webhook
      // evidence ⇒ MEDIUM (earns the stamp via the unchanged resolver); else WEAK (a
      // merchant assertion, below the bar — the honest in-between, no over-claim, P-XIV).
      source: hasTransactionEvidence ? "webhook" : "manual",
      strength: hasTransactionEvidence ? "medium" : "weak",
      transactionRef: reqRow?.transactionRef ?? null,
      transactionVerifiedAt: hasTransactionEvidence
        ? reqRow!.transactionVerifiedAt
        : null,
    }),
  ]);

  // T7.4 Increment 2 (T019) lands NEXT here: set proof.media_status='captured' on the
  // insert above (when mediaUrl present) and emit `media.captured` via emitInngest after
  // this batch, to drive the Railway normalize worker. NOT in Increment 1 — the worker
  // doesn't exist yet, so there is no consumer for the event. Intentionally deferred.

  return { proofId };
}

// Dev-only listing (T009) — seeded capture requests + their links for end-to-end
// testing (the dev styleguide/data surface, 404 in prod). NOT a ported merchant
// surface (05/06 → T7.4); QR is deferred (C1 = link-only).
export async function listCaptureRequests(
  workspaceId: string,
): Promise<
  Array<{
    token: string;
    status: string;
    expiresAt: string;
    customerName: string | null;
  }>
> {
  return withDbRetry(async () => {
    const rows = await getDb()
      .select({
        token: captureRequest.token,
        status: captureRequest.status,
        expiresAt: captureRequest.expiresAt,
        customerName: captureRequest.customerName,
      })
      .from(captureRequest)
      .where(eq(captureRequest.workspaceId, workspaceId))
      .orderBy(desc(captureRequest.createdAt));
    return rows.map((r) => ({
      token: r.token,
      status: r.status,
      expiresAt: new Date(r.expiresAt).toISOString(),
      customerName: r.customerName,
    }));
  });
}
