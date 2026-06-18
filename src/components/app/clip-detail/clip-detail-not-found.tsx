import { ArrowLeft, FileQuestion } from "lucide-react";
import Link from "next/link";

// The honest clip not-found panel (Server, T3.2 — the no-oracle state). Renders ZERO
// clip content and no raw error. The copy is IDENTICAL whether the id is missing,
// belongs to another workspace, or is a withdrawn clip — it never reveals which (no
// existence oracle, no cross-tenant or withdrawal leak; T2.3 property + P-VII). A
// back-to-Library link is the only affordance. Lives inside the persisting AppChrome.

export function ClipDetailNotFound() {
  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <Link
        href="/app/library"
        className="inline-flex items-center gap-1.5 font-ui text-body-sm text-ink-2 transition-colors duration-200 ease-pressroom hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
        Library
      </Link>

      <div className="mt-10 flex flex-col items-center rounded-clip border border-hairline bg-card px-6 py-20 text-center shadow-clip">
        <span className="flex size-12 items-center justify-center rounded-control bg-sunken text-ink-2">
          <FileQuestion className="size-6" strokeWidth={1.5} aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-display-sm text-ink">
          Clip not found
        </h1>
        <p className="mt-2 max-w-reading font-ui text-body text-ink-2">
          This clip doesn&rsquo;t exist, or it isn&rsquo;t in this workspace.
        </p>
        <Link
          href="/app/library"
          className="mt-6 inline-flex items-center gap-2 rounded-control border border-rule bg-card px-4 py-2 font-ui text-body-sm font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Back to the Library
        </Link>
      </div>
    </div>
  );
}
