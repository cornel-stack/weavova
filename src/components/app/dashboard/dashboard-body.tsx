import Link from "next/link";
import { ProofCard } from "@/components/proof-card";
import { getDashboardSummary } from "@/db/queries";
import { getSession } from "@/lib/session";
import { DashboardEmpty } from "./dashboard-empty";
import { DashboardHero } from "./dashboard-hero";
import { DashboardMasthead } from "./dashboard-masthead";

// The data integrator (async Server, T2.1). Performs the single workspace-scoped
// read inside the page's Suspense boundary, then composes the masthead, the
// latest-proof hero, and the recent-proof grid — or the empty state when the
// workspace has no proof yet.

export async function DashboardBody({ workspaceId }: { workspaceId: string }) {
  const [summary, session] = await Promise.all([
    getDashboardSummary(workspaceId),
    getSession(),
  ]);

  const isEmpty = summary.totalProof === 0;

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <DashboardMasthead summary={summary} userName={session.user.name} />

      {isEmpty ? (
        <DashboardEmpty />
      ) : (
        <>
          {summary.heroProof && (
            <section className="mt-10">
              <h2 className="font-ui text-label uppercase tracking-wide text-ink-3">
                Latest proof
              </h2>
              <div className="mt-3">
                <DashboardHero proof={summary.heroProof} />
              </div>
            </section>
          )}

          {summary.recentProof.length > 0 && (
            <section className="mt-12">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-ui text-label uppercase tracking-wide text-ink-3">
                  Recent proof
                </h2>
                <Link
                  href="/app/proof"
                  className="font-ui text-body-sm text-ink-2 underline-offset-4 transition-colors duration-200 ease-pressroom hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  View all in the inbox →
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                {summary.recentProof.map((p) => (
                  <ProofCard key={p.id} {...p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
