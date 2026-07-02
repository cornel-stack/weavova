import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

// T6.2 — the wizard step footer, ported from the designs: "Back" (left, from step 2 on),
// "Step N of 4" (centre), and the primary action (right — Continue / Finish setup). The
// primary control is supplied by each step (a form submit, or a link for the no-write step),
// so persimmon stays only on the real primary action (P-IV).

export function OnboardFooter({
  step,
  backHref,
  primary,
}: {
  step: 1 | 2 | 3 | 4;
  backHref?: string;
  primary: ReactNode;
}) {
  return (
    <div className="mt-8 flex items-center justify-between gap-4 border-t border-hairline pt-6">
      <div className="min-w-24">
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 rounded-control px-3 py-2 font-ui text-body-sm text-ink-2 transition-colors duration-200 ease-pressroom hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />
            Back
          </Link>
        ) : null}
      </div>
      <span className="font-ui text-label uppercase tracking-wide text-ink-3">
        Step {step} of 4
      </span>
      <div className="flex min-w-24 justify-end">{primary}</div>
    </div>
  );
}

// The shared primary-action classes (persimmon). Used by step submit buttons / the
// no-write step's Continue link so the primary action reads identically across steps.
export const onboardPrimaryClass =
  "inline-flex items-center justify-center gap-2 rounded-control bg-persimmon px-5 py-2.5 font-ui text-body-sm font-medium text-on-accent transition-colors duration-200 ease-pressroom hover:bg-persimmon-deep disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
