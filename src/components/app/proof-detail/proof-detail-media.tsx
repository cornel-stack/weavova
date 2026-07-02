import { Play } from "lucide-react";
import type { ProofDetailView } from "@/lib/proof";

// Conditional media region (Server, T2.3 — Q1/FR-009; T7.2 — media reference landed).
// The region renders ONLY when the proof actually has media. The real media reference is
// the T7.2 `mediaUrl` (captured source-media R2 key); `thumbnail` (a poster, T8) is also
// honored. For text + every existing fixture BOTH are null → hasMedia is false → this
// renders NOTHING (the transcript/quote leads). When media exists, this shows the honest
// NON-PLAYING seam (poster placeholder + "playback at T8") — never a <video>, never an
// <img> on the media key, never a fabricated duration/scrubber/play action (FR-019).
// Real playback is the T8 render engine's job (it reads mediaUrl); no relayout when it lands.

function hasMedia(proof: ProofDetailView): boolean {
  return (
    proof.proofType !== "text" &&
    (proof.mediaUrl != null || proof.thumbnail != null)
  );
}

export function ProofDetailMedia({ proof }: { proof: ProofDetailView }) {
  if (!hasMedia(proof)) {
    return null;
  }

  // The honest non-playing seam: a poster placeholder labelling the stored media, with an
  // explicit "playback at T8" note. The player is wired in T8 (it reads mediaUrl).
  return (
    <div className="relative flex aspect-video items-center justify-center rounded-control bg-sunken">
      <Play className="size-9 text-ink-2" strokeWidth={1.5} aria-hidden />
      <span className="absolute bottom-3 left-3 rounded-pill bg-card/90 px-2.5 py-1 font-mono text-mono-sm text-ink-2">
        customer {proof.proofType}
      </span>
      {proof.mediaUrl != null && (
        <span className="absolute bottom-3 right-3 rounded-pill bg-card/90 px-2.5 py-1 font-ui text-label uppercase tracking-wide text-ink-3">
          {/* T7.2b — honest per-type label (was hard-coded "video"); a photo/audio proof
              now reads "photo/audio stored", not "video stored". */}
          {proof.proofType} stored · playback coming
        </span>
      )}
    </div>
  );
}
