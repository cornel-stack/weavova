import { ClipDetailNotFound } from "@/components/app/clip-detail/clip-detail-not-found";

// Route-segment not-found boundary (T3.2). Next's notFound() — called in
// clip-detail-data.tsx when getClip returns null (a missing OR cross-workspace OR
// withdrawn clip) — routes here. One honest, content-free state for all three cases
// (no existence oracle), inside the persisting AppChrome. Structurally distinct from
// error.tsx.

export default function NotFound() {
  return <ClipDetailNotFound />;
}
