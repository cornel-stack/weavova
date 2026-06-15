import { FileText } from "lucide-react";

// No-proof-at-all empty state (T2.2), ported from /design-reference screen 17.
// Shown by InboxData when the workspace has zero proof. The filter/sort/search
// chrome is hidden (nothing to filter); the quiet sub-header keeps the single
// inert "Request proof" primary so the owner is oriented toward capturing. This
// is distinct from the client filtered-empty state (a filter matching nothing).

export function InboxEmpty() {
  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <h1 className="font-display text-display-lg text-ink">Proof</h1>

        {/* Primary action — persimmon. Present-but-not-yet-wired (the request
            flow is a later tier); inert no-op that never errors (FR-014a). */}
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-control bg-persimmon px-4 py-2 font-ui text-body-sm font-medium text-on-accent transition-colors duration-200 ease-pressroom hover:bg-persimmon-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Request proof
        </button>
      </header>

      <div className="mt-10 flex flex-col items-center rounded-clip border border-hairline bg-card px-6 py-20 text-center shadow-clip">
        <span className="flex size-12 items-center justify-center rounded-control bg-sunken text-ink-2">
          <FileText className="size-6" strokeWidth={1.5} aria-hidden />
        </span>
        <h2 className="mt-5 font-display text-display-sm text-ink">
          Nothing pinned up yet.
        </h2>
        <p className="mt-2 max-w-reading font-ui text-body text-ink-2">
          Connect a source and the proof comes in on its own — every sale or
          booking becomes a chance to capture a real customer.
        </p>
      </div>
    </div>
  );
}
