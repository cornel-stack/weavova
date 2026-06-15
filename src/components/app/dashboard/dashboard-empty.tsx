import { Inbox } from "lucide-react";

// Empty state (T2.1): shown when the workspace has no proof yet. The masthead
// (greeting + zeroed KPIs + the persimmon "Request proof" action) still renders
// above this; this panel directs the user to that action without a second
// persimmon button (one primary action — P-IV).

export function DashboardEmpty() {
  return (
    <div className="mt-10 flex flex-col items-center rounded-clip border border-hairline bg-card px-6 py-20 text-center shadow-clip">
      <span className="flex size-12 items-center justify-center rounded-pill bg-sunken text-ink-2">
        <Inbox className="size-6" strokeWidth={1.5} aria-hidden />
      </span>
      <h2 className="mt-5 font-display text-display-sm text-ink">No proof yet</h2>
      <p className="mt-2 max-w-reading font-ui text-body text-ink-2">
        When a customer shares a real moment, it lands here. Use{" "}
        <span className="font-medium text-ink">Request proof</span> above to start
        collecting.
      </p>
    </div>
  );
}
