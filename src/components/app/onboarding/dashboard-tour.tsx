"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// T6.2 · US5 — the dashboard spotlight tour. PORT of design "5 _ Dashboard spotlight tour".
// A NON-BLOCKING one-shot: it appears only when the finish redirect lands on /app?tour=1, and
// it does NOT persist — a refresh without the param shows nothing (no tour_seen column). It
// sits over the REAL dashboard: on a fresh workspace the masthead it points at is the honest
// zeroed state (no fabricated numbers — P-XIV).
//
// SCOPE NOTE (design-sync): the synced design renders only tour step 1 verbatim ("Your
// masthead"). Per the port-don't-invent rule (P-V/P-XII) this ships that one verbatim step;
// steps 2–5 slot in behind this same overlay when their copy is synced. (Decision: ship
// step 1 only — no invented copy.)

const STEP1 = {
  title: "Your masthead",
  body:
    "The numbers that matter — what’s new, what’s waiting, and what’s working — read like the top of a paper.",
};

export function DashboardTour() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // One-shot: open when ?tour=1 is present, then strip the param so a refresh won't re-open
  // and the URL stays clean. No persistence beyond this.
  useEffect(() => {
    if (searchParams.get("tour") === "1") {
      setOpen(true);
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, router, pathname]);

  if (!open) return null;

  function dismiss() {
    setOpen(false);
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-24 sm:pt-28"
      role="dialog"
      aria-label="Dashboard tour"
    >
      {/* A soft scrim — click to dismiss. Non-blocking: it's a coachmark, not a modal gate. */}
      <button
        type="button"
        aria-label="Dismiss tour"
        onClick={dismiss}
        className="fixed inset-0 -z-10 cursor-default bg-ink/15"
      />
      <div className="w-full max-w-md rounded-modal border border-hairline bg-card p-5 shadow-modal">
        <div className="flex items-center justify-between gap-3">
          <span className="font-ui text-label uppercase tracking-wide text-ink-3">
            Tour · 1 of 1
          </span>
        </div>
        <h2 className="mt-3 font-display text-display-xs text-ink">{STEP1.title}</h2>
        <p className="mt-2 font-ui text-body-sm text-ink-2">{STEP1.body}</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-control px-3 py-2 font-ui text-body-sm text-ink-3 transition-colors duration-200 ease-pressroom hover:text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Skip tour
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex items-center justify-center rounded-control bg-ink px-4 py-2 font-ui text-body-sm font-medium text-paper transition-colors duration-200 ease-pressroom hover:bg-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
