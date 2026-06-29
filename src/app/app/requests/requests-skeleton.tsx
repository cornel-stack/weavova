// Loading skeleton for /app/requests (US2, ref 05) — mirrors the "SAVED TEMPLATES" label + a
// two-up card grid while the workspace-scoped read streams. Quiet, on-token (P-XIII states).
export function RequestsSkeleton() {
  return (
    <section className="mt-8" aria-hidden>
      <div className="h-3 w-28 rounded-pill bg-sunken" />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-clip border border-hairline bg-card p-5 shadow-clip"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="h-5 w-40 rounded-pill bg-sunken" />
              <div className="h-5 w-16 rounded-pill bg-sunken" />
            </div>
            <div className="mt-4 h-3 w-3/4 rounded-pill bg-sunken" />
            <div className="mt-5 flex items-center justify-between border-t border-hairline pt-3">
              <div className="h-3 w-40 rounded-pill bg-sunken" />
              <div className="h-3 w-12 rounded-pill bg-sunken" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
