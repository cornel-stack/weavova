import {
  BadgeCheck,
  CalendarDays,
  CircleDashed,
  CircleDot,
  FileText,
  Store,
} from "lucide-react";
import type { ProofType, ProofDetailView } from "@/lib/proof";

// The side-panel metadata (Server, T2.3): customer name + verified-real-customer
// mark, source, captured date, proof type, and the reviewed/unreviewed state — all
// from the proof's real data. The unbacked product/variant line and capture-channel
// phrasing are omitted, not fabricated (FR-017/019). Quiet chrome; persimmon only on
// the verified mark.
//
// T7.5 — the honest in-between (consent_only): a proof with granted consent but no
// qualifying transaction basis shows a QUIET, NON-persimmon line ("Consent recorded ·
// transaction unconfirmed") here on detail ONLY — never the stamp, never a competing
// badge, and NO equivalent on dense cards (there, stamp ABSENCE is the signal — P-IV).
// Drawn from the design's binary stamped/unmarked model as a documented derived state
// (P-XII / P-XIII). Driven by verificationState (the resolver), not a re-derivation.

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

const TYPE_LABEL: Record<ProofType, string> = {
  text: "Text",
  video: "Video",
  photo: "Photo",
  audio: "Audio",
};

export function ProofDetailMeta({ proof }: { proof: ProofDetailView }) {
  return (
    <div className="rounded-clip border border-hairline bg-card p-5 shadow-clip">
      <div className="flex items-center gap-2">
        <h2 className="font-display text-display-xs text-ink">
          {proof.customerName}
        </h2>
        {proof.verified && (
          <span
            className="flex items-center text-persimmon"
            title="Verified real customer"
          >
            <BadgeCheck className="size-4" strokeWidth={1.5} aria-hidden />
            <span className="sr-only">Verified real customer</span>
          </span>
        )}
      </div>

      {proof.verificationState === "consent_only" && (
        <p className="mt-3 flex items-center gap-2 font-ui text-body-sm text-ink-2">
          <CircleDashed
            className="size-4 shrink-0 text-ink-3"
            strokeWidth={1.5}
            aria-hidden
          />
          <span>Consent recorded · transaction unconfirmed</span>
        </p>
      )}

      <dl className="mt-4 space-y-2.5 font-ui text-body-sm text-ink-2">
        <div className="flex items-center gap-2">
          <Store className="size-4 text-ink-3" strokeWidth={1.5} aria-hidden />
          <dt className="sr-only">Source</dt>
          <dd>{proof.source}</dd>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-ink-3" strokeWidth={1.5} aria-hidden />
          <dt className="sr-only">Captured</dt>
          <dd>Captured {formatDate(proof.capturedAt)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-ink-3" strokeWidth={1.5} aria-hidden />
          <dt className="sr-only">Type</dt>
          <dd>{TYPE_LABEL[proof.proofType]} proof</dd>
        </div>
        <div className="flex items-center gap-2">
          <CircleDot className="size-4 text-ink-3" strokeWidth={1.5} aria-hidden />
          <dt className="sr-only">Review state</dt>
          <dd>{proof.reviewed ? "Reviewed" : "Unreviewed"}</dd>
        </div>
      </dl>
    </div>
  );
}
