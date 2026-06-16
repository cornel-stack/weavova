import { ProofDetailNotFound } from "@/components/app/proof-detail/proof-detail-not-found";

// Route-segment not-found boundary (T2.3). Next's notFound() — called in
// proof-detail-data.tsx when getProof returns null (a missing OR cross-workspace
// id) — routes here. One honest, content-free state for both cases (no existence
// oracle), inside the persisting AppChrome. Structurally distinct from error.tsx.

export default function NotFound() {
  return <ProofDetailNotFound />;
}
