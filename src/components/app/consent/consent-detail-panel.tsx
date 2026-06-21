"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { getProofConsentDetail } from "@/app/app/consent/actions";
import type { ProofConsentDetail } from "@/lib/consent";
import type { ConsentState } from "@/lib/proof";
import { ConsentWithdrawDialog } from "./consent-withdraw-dialog";

// The per-proof consent detail (Client, T5-Consent) — a DERIVED surface (screen 13 has
// the ledger only). On row-open it lazily fetches the detail bundle (getProofConsentDetail
// = the FULL retained version timeline + the made-under provenance, one round-trip).
// Renders: the retained timeline (superseded/withdrawn versions SHOWN, never erased),
// the made-under provenance per clip (Q2), and — for a currently-GRANTED proof only —
// the Record-withdrawal entry (which opens the honest cascade-preview confirm). There
// is NO re-grant control: re-consent is the customer's act (T7).

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

const VERSION_LABEL: Record<ConsentState, string> = {
  granted: "Granted",
  awaiting: "Awaiting",
  revoked: "Withdrawn",
};

const VERSION_DOT: Record<ConsentState, string> = {
  granted: "bg-success",
  awaiting: "bg-warning",
  revoked: "bg-danger",
};

export function ConsentDetailPanel({
  proofId,
  customerName,
  state,
}: {
  proofId: string;
  customerName: string;
  state: ConsentState;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<ProofConsentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    getProofConsentDetail(proofId)
      .then((d) => setDetail(d))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [proofId]);

  useEffect(() => {
    load();
  }, [load]);

  function onRecorded() {
    setDialogOpen(false);
    load(); // re-pull the timeline (new withdrawn version)
    router.refresh(); // re-pull the ledger + let the free cascade surface
  }

  if (loading) {
    return (
      <p className="font-ui text-body-sm text-ink-3" aria-live="polite">
        Loading consent history…
      </p>
    );
  }

  if (failed || !detail) {
    return (
      <div className="flex items-center gap-3">
        <p className="font-ui text-body-sm text-ink-2">
          Couldn&rsquo;t load consent history.
        </p>
        <button
          type="button"
          onClick={load}
          className="font-ui text-body-sm font-medium text-ink underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* the retained version timeline — pull, don't destroy */}
      <div>
        <h3 className="font-ui text-label uppercase tracking-wide text-ink-3">
          Consent history
        </h3>
        <ol className="mt-3 space-y-3">
          {detail.history.map((v) => (
            <li key={v.version} className="flex items-center gap-3">
              <span
                className={`size-2 rounded-pill ${VERSION_DOT[v.state]}`}
                aria-hidden
              />
              <span className="font-ui text-body-sm text-ink">
                v{v.version} · {VERSION_LABEL[v.state]}
              </span>
              <span className="ml-auto font-mono text-mono-sm text-ink-3">
                {formatDate(v.effectiveAt)}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 font-ui text-body-sm text-ink-3">
          Every version is kept — withdrawing records a new version, it never
          erases the trail.
        </p>
      </div>

      {/* made-under provenance + the record-withdrawal action */}
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="font-ui text-label uppercase tracking-wide text-ink-3">
            Clips made under consent
          </h3>
          {detail.clips.length === 0 ? (
            <p className="mt-3 font-ui text-body-sm text-ink-3">
              No clips have been made from this proof.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {detail.clips.map((clip) => (
                <li
                  key={clip.clipId}
                  className="flex items-center gap-2 font-ui text-body-sm text-ink-2"
                >
                  <span className="font-mono text-mono-sm text-ink-3">
                    {clip.format}
                  </span>
                  <span>· made under v{clip.madeUnderVersion}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* the live control — ONLY for a currently-granted proof. No re-grant. */}
        {state === "granted" && (
          <div className="mt-auto">
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="inline-flex items-center gap-2 rounded-control border border-rule bg-card px-4 py-2 font-ui text-body-sm font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <ShieldOff className="size-4" strokeWidth={1.5} aria-hidden />
              Record withdrawal
            </button>
            <p className="mt-2 font-ui text-body-sm text-ink-3">
              Record that {customerName} has withdrawn consent. This is the
              customer&rsquo;s choice — re-consent can only come from them.
            </p>
          </div>
        )}
      </div>

      {dialogOpen && (
        <ConsentWithdrawDialog
          proofId={proofId}
          customerName={customerName}
          clipCount={detail.clips.length}
          onClose={() => setDialogOpen(false)}
          onRecorded={onRecorded}
        />
      )}
    </div>
  );
}
