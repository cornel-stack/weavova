"use client";

import { useState } from "react";
import { recordWithdrawal } from "@/app/app/consent/actions";

// The cascade-preview confirm (Client, T5-Consent). Before committing, it shows the
// HONEST effect of recording a withdrawal — the proof + the exact clip count that will
// be WITHHELD (retained, not deleted) from Library, showcase, and export. The count is
// the SHARED read's clips.length (no separate query). On confirm it calls the
// recordWithdrawal action (which re-checks grant, appends a new withdrawn version, and
// fires one revalidate so the free cascade surfaces). Copy frames it as recording the
// CUSTOMER's withdrawal — never a brand-side revoke. There is no re-grant path.

function clipPhrase(n: number): string {
  return n === 1 ? "1 clip" : `${n} clips`;
}

export function ConsentWithdrawDialog({
  proofId,
  customerName,
  clipCount,
  onClose,
  onRecorded,
}: {
  proofId: string;
  customerName: string;
  clipCount: number;
  onClose: () => void;
  onRecorded: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onConfirm() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await recordWithdrawal(proofId);
      if (res.status === "recorded") {
        onRecorded();
      } else if (res.status === "not_granted") {
        setError("This proof is already withdrawn.");
      } else {
        setError("Couldn’t record the withdrawal — try again.");
      }
    } catch {
      setError("Couldn’t record the withdrawal — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Record ${customerName}'s withdrawal`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-modal border border-rule bg-card p-6 shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-display-sm text-ink">
          Record {customerName}&rsquo;s withdrawal
        </h2>

        <p className="mt-3 font-ui text-body text-ink-2">
          This records that {customerName} has withdrawn consent. It will withhold
          their proof
          {clipCount > 0 ? (
            <>
              {" "}
              and <span className="font-medium text-ink">{clipPhrase(clipCount)}</span>{" "}
              from Library, showcase, and export
            </>
          ) : (
            " from Library, showcase, and export"
          )}{" "}
          — <span className="font-medium text-ink">retained, not deleted</span>.
        </p>

        <p className="mt-3 font-ui text-body-sm text-ink-3">
          Re-consent can only come from {customerName}, never from here.
        </p>

        {error && (
          <p
            className="mt-4 font-ui text-body-sm text-danger"
            role="status"
            aria-live="polite"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="font-ui text-body-sm text-ink-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending}
            className="inline-flex items-center gap-2 rounded-control bg-persimmon px-4 py-2 font-ui text-body-sm font-medium text-on-accent transition-colors duration-200 ease-pressroom hover:bg-persimmon-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Recording…" : "Record withdrawal"}
          </button>
        </div>
      </div>
    </div>
  );
}
