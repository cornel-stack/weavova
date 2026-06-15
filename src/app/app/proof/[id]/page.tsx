import { SectionPlaceholder } from "@/components/app/section-placeholder";

// Minimal placeholder for the proof detail (T2.2). The real detail — review,
// consent, and the route into the clip studio — is T2.3. This exists so the
// inbox Wall's per-card navigation lands on a valid route (no 404), inside the
// /app shell. The workspace-scoped getProof(workspaceId, id) is ready for T2.3.

export const metadata = {
  title: "Proof — Weavova",
};

export default function ProofDetailPage() {
  return <SectionPlaceholder title="Proof detail" tier="T2.3" />;
}
