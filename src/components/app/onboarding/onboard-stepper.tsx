import { Check } from "lucide-react";

// T6.2 — the wizard progress rail, ported from the onboarding designs' header
// ("1 Business · 2 Source · 3 Brand · 4 Format", completed steps marked ✓). Pure/server —
// each step page renders it with its own `current` (1..4). On-token, light + dark.

const STEPS = [
  { n: 1, label: "Business" },
  { n: 2, label: "Source" },
  { n: 3, label: "Brand" },
  { n: 4, label: "Format" },
] as const;

export function OnboardStepper({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2" aria-label="Onboarding progress">
      {STEPS.map((s, i) => {
        const done = s.n < current;
        const active = s.n === current;
        return (
          <li key={s.n} className="flex items-center gap-2">
            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 font-ui text-label uppercase tracking-wide transition-colors duration-200 ease-pressroom",
                active
                  ? "bg-ink text-paper"
                  : done
                    ? "bg-success-tint text-success"
                    : "bg-sunken text-ink-3",
              ].join(" ")}
              aria-current={active ? "step" : undefined}
            >
              <span className="inline-flex size-4 items-center justify-center">
                {done ? (
                  <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
                ) : (
                  s.n
                )}
              </span>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span aria-hidden className="h-px w-4 bg-rule sm:w-6" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
