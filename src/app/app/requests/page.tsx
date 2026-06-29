import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { RequestsData } from "./requests-data";
import { RequestsSkeleton } from "./requests-skeleton";

// PORT: 05 _ Collection requests (/app/requests). Replaces the T1 placeholder — the Requests nav
// route goes LIVE (no nav edit; it already points here). Authenticated /app surface (middleware +
// workspace-scoped read in RequestsData). The global search/⌘K lives in the chrome top bar; this
// page renders the title + "New request" action + the templates grid (the established /app
// page-header pattern). Streams a skeleton while the workspace-scoped read resolves.

export const metadata = {
  title: "Requests — Weavova",
};

export default function RequestsPage() {
  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-display-lg text-ink">
          Collection requests
        </h1>
        <Link
          href="/app/requests/new"
          className="inline-flex items-center gap-2 rounded-control bg-persimmon px-4 py-2.5 font-ui text-body-sm font-medium text-on-accent transition-colors duration-200 ease-pressroom hover:bg-persimmon-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          New request
        </Link>
      </div>

      <Suspense fallback={<RequestsSkeleton />}>
        <RequestsData />
      </Suspense>
    </div>
  );
}
