import type { DashboardSummary } from "@/db/queries";
import { DashboardKpis } from "./dashboard-kpis";

// The masthead (T2.1), ported from screen 01: a quiet greeting (time-of-day +
// first name + the count of proof awaiting review), the "Request proof" primary
// action, and the computed KPI strip. The greeting stays ink — persimmon is
// reserved for the primary action and the verified mark (P-IV).

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardMasthead({
  summary,
  userName,
}: {
  summary: DashboardSummary;
  userName: string;
}) {
  const firstName = userName.split(/\s+/)[0] || userName;
  // Server-time greeting (A-05): morning / afternoon / evening.
  const greeting = greetingForHour(new Date().getHours());
  const { needsReview } = summary;

  return (
    <header>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-display text-display-xl text-ink">
          {greeting}, {firstName}
          {needsReview > 0 && (
            <>
              {" "}
              — {needsReview} to review this week.
            </>
          )}
        </h1>

        {/* Primary action — persimmon. Present-but-not-yet-wired (the request
            flow is a later tier); inert no-op that never errors (FR-010). */}
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-control bg-persimmon px-4 py-2 font-ui text-body-sm font-medium text-on-accent transition-colors duration-200 ease-pressroom hover:bg-persimmon-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Request proof
        </button>
      </div>

      <div className="mt-8">
        <DashboardKpis summary={summary} />
      </div>
    </header>
  );
}
