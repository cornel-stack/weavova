import { Play } from "lucide-react";
import type { ProofDetailView } from "@/lib/proof";

// Conditional media region (Server, T2.3 — Q1/FR-009). The region renders ONLY
// when the proof actually has media. `thumbnail` is the only media reference today
// and is null for every fixture, so hasMedia is false → this renders NOTHING (no
// empty frame, poster, placeholder, or fake/disabled player) and the transcript/
// quote leads as the content. Same seam logic as the T2.1 clip cells: when a real
// media reference lands (T7/T8) the region renders the player with no relayout.
// The detail never fabricates a duration, scrubber, or play action (FR-019).

function hasMedia(proof: ProofDetailView): boolean {
  return proof.proofType !== "text" && proof.thumbnail != null;
}

export function ProofDetailMedia({ proof }: { proof: ProofDetailView }) {
  if (!hasMedia(proof)) {
    return null;
  }

  // Reached only when real media exists (none in the current fixtures); the player
  // is wired in T7/T8. The poster region mirrors the ProofCard's media idiom.
  return (
    <div className="relative flex aspect-video items-center justify-center rounded-control bg-sunken">
      <Play className="size-9 text-ink-2" strokeWidth={1.5} aria-hidden />
      <span className="absolute bottom-3 left-3 rounded-pill bg-card/90 px-2.5 py-1 font-mono text-mono-sm text-ink-2">
        customer {proof.proofType}
      </span>
    </div>
  );
}
