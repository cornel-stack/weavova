import type { ReactNode } from "react";

// NEW, auth-only shared frame — a faithful PORT (Principle V) of the split layout from
// design-reference/Weavova/Authentication screens 1 (Sign in) and 4 (Verify email).
// NOT used by /app: it touches no FR-021 consumer. The left proof column is the
// Principle II surface — a REAL seeded customer proof (Maria L., the seeded Shopify
// video), never fabricated (P-XIV). Persimmon stays scarce: the brand stamp, the
// "Verified real customer" mark, and the form's primary action only.

// The woven-knot brand mark, ported verbatim from the source SVG (two interlocking
// strokes). Reconciled to CURRENT tokens (the export carried the stale persimmon):
// one strand persimmon, one ink.
function KnotMark() {
  return (
    <svg
      viewBox="0 0 32 32"
      width="26"
      height="26"
      fill="none"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path
        d="M7 11c0-3 3-5 6-3.5l6 3.4c3 1.7 3 5.4 0 7.1l-6 3.4C10 24 7 22 7 19"
        className="stroke-persimmon"
      />
      <path
        d="M25 21c0 3-3 5-6 3.5l-6-3.4c-3-1.7-3-5.4 0-7.1l6-3.4c3-1.5 6 .5 6 3.5"
        className="stroke-ink"
      />
    </svg>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <KnotMark />
      <span className="font-display text-display-sm text-ink">
        Weavova<span className="text-persimmon">.</span>
      </span>
    </div>
  );
}

// The "Verified real customer" mark — the verified check (ported path) in persimmon.
function VerifiedMark() {
  return (
    <p className="flex items-center gap-1.5 font-ui text-label uppercase tracking-wide text-persimmon">
      <svg
        viewBox="0 0 22 22"
        width="15"
        height="15"
        fill="none"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-persimmon"
        aria-hidden
      >
        <circle cx="11" cy="11" r="9" />
        <path d="M6.5 11.2l3 3 6-6.4" />
      </svg>
      Verified real customer
    </p>
  );
}

// The proof panel (hidden below md; the form column shows a compact wordmark there).
function ProofPanel() {
  return (
    <aside className="hidden flex-col justify-between gap-10 bg-paper p-10 md:flex lg:p-12">
      <Wordmark />

      <div>
        <VerifiedMark />
        <blockquote className="mt-4 font-display text-display-lg text-ink">
          &ldquo;My whole flat smells like a spa now &mdash; I&rsquo;ve already
          repurchased three times.&rdquo;
        </blockquote>
        <div className="mt-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-pill bg-sunken font-ui text-body-sm font-medium text-ink">
            ML
          </span>
          <div>
            <div className="font-ui text-body-sm font-medium text-ink">
              Maria L.
            </div>
            <div className="font-mono text-mono-sm text-ink-3">
              Shopify &middot; Soy candle &middot; Fig &amp; Cedar
            </div>
          </div>
        </div>
      </div>

      <p className="font-display text-body italic text-ink-3">
        The customer is the headline.
      </p>
    </aside>
  );
}

// The auth shell: proof column + form column. `children` is the form (heading,
// providers, magic-link form) supplied by each auth page.
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen grid-cols-1 bg-card md:grid-cols-[46fr_54fr]">
      <ProofPanel />
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-[360px]">
          {/* the proof panel is hidden on mobile — keep the brand mark visible */}
          <div className="mb-8 md:hidden">
            <Wordmark />
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
