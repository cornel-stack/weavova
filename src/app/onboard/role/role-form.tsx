"use client";

import { useState } from "react";
import { BUSINESS_TYPE_OPTIONS, type BusinessType } from "@/lib/onboarding";
import { OnboardFooter, onboardPrimaryClass } from "@/components/app/onboarding/onboard-footer";
import { saveBusinessTypeAndContinue } from "../actions";

// T6.2 · Step 1 (design: 1 _ Business type  _onboard_role). Six selectable cards; Continue
// (persimmon) is enabled once a type is picked and submits the real business_type write.
// Pre-fills the merchant's prior choice on resume.

export function RoleForm({ initial }: { initial: BusinessType | null }) {
  const [selected, setSelected] = useState<BusinessType | null>(initial);

  return (
    <form action={saveBusinessTypeAndContinue}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {BUSINESS_TYPE_OPTIONS.map((opt) => {
          const active = selected === opt.value;
          return (
            <label
              key={opt.value}
              className={[
                "flex cursor-pointer flex-col gap-1 rounded-clip border bg-card p-4 shadow-clip transition-colors duration-200 ease-pressroom focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink",
                active
                  ? "border-persimmon ring-1 ring-persimmon"
                  : "border-hairline hover:border-rule",
              ].join(" ")}
            >
              <input
                type="radio"
                name="businessType"
                value={opt.value}
                checked={active}
                onChange={() => setSelected(opt.value)}
                className="sr-only"
              />
              <span className="font-ui text-heading-md text-ink">{opt.label}</span>
              <span className="font-ui text-body-sm text-ink-2">{opt.sub}</span>
            </label>
          );
        })}
      </div>

      <OnboardFooter
        step={1}
        primary={
          <button type="submit" className={onboardPrimaryClass} disabled={!selected}>
            Continue
          </button>
        }
      />
    </form>
  );
}
