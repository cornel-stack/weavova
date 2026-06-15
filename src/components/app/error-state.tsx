import { RotateCcw } from "lucide-react";

// One shared, presentational error surface (T2.1). Reused by both the page
// error boundary (src/app/app/error.tsx) and the root boundary
// (src/app/error.tsx) so there is a single themed error UI. It never renders
// raw error text, stacks, digests, or connection strings — the boundaries pass
// only a safe message and the framework's reset() as onRetry.

export function ErrorState({
  onRetry,
  title = "Something went wrong",
  description = "We couldn't load this just now. This can happen on the first request after a quiet spell. Try again in a moment.",
}: {
  onRetry: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <div className="mx-auto flex max-w-reading flex-col items-center px-6 py-24 text-center">
      <h1 className="font-display text-display-md text-ink">{title}</h1>
      <p className="mt-3 font-ui text-body text-ink-2">{description}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-8 inline-flex items-center gap-2 rounded-control bg-persimmon px-4 py-2 font-ui text-body-sm font-medium text-on-accent transition-colors duration-200 ease-pressroom hover:bg-persimmon-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <RotateCcw className="size-4" strokeWidth={1.5} aria-hidden />
        Try again
      </button>
    </div>
  );
}
