import { ProofDetailNotFound } from "@/components/app/proof-detail/proof-detail-not-found";

// Route-segment not-found boundary (T2.4b). Next's notFound() — called in
// studio-data.tsx when getProof returns null (a missing OR cross-workspace id) —
// routes here. Reuses the detail's honest, content-free not-found (no existence
// oracle, no leak), inside the persisting AppChrome. Structurally distinct from
// error.tsx.

export default function NotFound() {
  return <ProofDetailNotFound />;
}
