import { asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "./client";
import { consent, proof, source, workspace } from "./schema";
import type { ConsentState, ProofView } from "@/lib/proof";

export type Workspace = typeof workspace.$inferSelect;

// The seeded demo workspace (oldest row). The session/workspace seam
// (src/lib/session.ts) wraps this; T6 replaces the seam with real auth.
export async function getDefaultWorkspace(): Promise<Workspace | null> {
  const rows = await getDb()
    .select()
    .from(workspace)
    .orderBy(asc(workspace.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

// Effective consent = the latest version's state (correlated subquery). A proof
// with no consent row yields null → mapped to a non-granted state (fails closed).
const latestConsentState = sql<ConsentState | null>`(
  select c.state from ${consent} c
  where c.proof_id = ${proof.id}
  order by c.version desc
  limit 1
)`;

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

export async function getProofs(): Promise<ProofView[]> {
  const rows = await getDb()
    .select(proofColumns)
    .from(proof)
    .innerJoin(source, eq(proof.sourceId, source.id))
    .orderBy(desc(proof.capturedAt));
  return rows.map(toView);
}

export async function getProof(id: string): Promise<ProofView | null> {
  const rows = await getDb()
    .select(proofColumns)
    .from(proof)
    .innerJoin(source, eq(proof.sourceId, source.id))
    .where(eq(proof.id, id))
    .limit(1);
  return rows[0] ? toView(rows[0]) : null;
}
