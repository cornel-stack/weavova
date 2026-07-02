"use client";

import { useState } from "react";
import { FIRST_FORMAT_OPTIONS, type FirstFormat } from "@/lib/onboarding";
import { OnboardFooter, onboardPrimaryClass } from "@/components/app/onboarding/onboard-footer";
import { saveFirstFormatAndFinish } from "../actions";

// T6.2 · Step 4 (design: 4 _ First format  _onboard_format). The tiles are DECORATIVE
// concept-art (the design has NO preview/render of the user's proof) — a small static motif
// per format, NOT a rendered clip and NOT a fabricated preview (P-XIV). Selecting one writes
// the first_format PREFERENCE only; the render engine (T8) honours it later. Finish setup then
// sets onboarded_at and lands in the app.

export function FormatForm({ initial }: { initial: FirstFormat | null }) {
  const [selected, setSelected] = useState<FirstFormat | null>(initial);

  return (
    <form action={saveFirstFormatAndFinish}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FIRST_FORMAT_OPTIONS.map((opt) => {
          const active = selected === opt.value;
          return (
            <label
              key={opt.value}
              className={[
                "flex cursor-pointer flex-col gap-3 rounded-clip border bg-card p-4 shadow-clip transition-colors duration-200 ease-pressroom focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink",
                active
                  ? "border-persimmon ring-1 ring-persimmon"
                  : "border-hairline hover:border-rule",
              ].join(" ")}
            >
              <input
                type="radio"
                name="firstFormat"
                value={opt.value}
                checked={active}
                onChange={() => setSelected(opt.value)}
                className="sr-only"
              />
              {/* Decorative static motif — a warm-paper swatch with a quiet accent bar.
                  Purely illustrative of the FORMAT; renders no proof, no preview (P-XIV). */}
              <span
                aria-hidden
                className="flex h-20 w-full items-end overflow-hidden rounded-clip bg-sunken p-2"
              >
                <span className="h-2 w-2/3 rounded-pill bg-rule" />
              </span>
              <span className="block font-ui text-heading-md text-ink">{opt.label}</span>
            </label>
          );
        })}
      </div>

      <OnboardFooter
        step={4}
        backHref="/onboard/brand"
        primary={
          <button type="submit" className={onboardPrimaryClass} disabled={!selected}>
            Finish setup
          </button>
        }
      />
    </form>
  );
}
