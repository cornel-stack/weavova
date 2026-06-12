import type { ReactNode } from "react";
import { Swatch } from "@/components/ui/swatch";

export const metadata = {
  title: "Styleguide — Weavova",
};

// Palette — token name, bg utility, Daylight hex, Ink hex (constitution v1.1.2).
const PALETTE: { name: string; swatchClass: string; daylight: string; ink: string }[] = [
  { name: "paper", swatchClass: "bg-paper", daylight: "#F4F1E8", ink: "#15120E" },
  { name: "card", swatchClass: "bg-card", daylight: "#FEFDF8", ink: "#1F1B15" },
  { name: "sunken", swatchClass: "bg-sunken", daylight: "#E9E5D6", ink: "#2A251D" },
  { name: "ink", swatchClass: "bg-ink", daylight: "#1C1714", ink: "#F4EEE2" },
  { name: "ink-2", swatchClass: "bg-ink-2", daylight: "#595046", ink: "#B4AB99" },
  { name: "ink-3", swatchClass: "bg-ink-3", daylight: "#968B79", ink: "#7B7363" },
  { name: "hairline", swatchClass: "bg-hairline", daylight: "#E4DAC8", ink: "#322B20" },
  { name: "rule", swatchClass: "bg-rule", daylight: "#CDC1AB", ink: "#463D2D" },
  { name: "persimmon", swatchClass: "bg-persimmon", daylight: "#B5443C", ink: "#CA5F51" },
  { name: "persimmon-deep", swatchClass: "bg-persimmon-deep", daylight: "#8F342E", ink: "(persimmon)" },
  { name: "persimmon-tint", swatchClass: "bg-persimmon-tint", daylight: "#F5DFD8", ink: "#3A261F" },
  { name: "on-accent", swatchClass: "bg-on-accent", daylight: "#FFFFFF", ink: "#FFFFFF" },
  { name: "success", swatchClass: "bg-success", daylight: "#2E6B43", ink: "#5FB572" },
  { name: "success-tint", swatchClass: "bg-success-tint", daylight: "#E3EDE3", ink: "#293424" },
  { name: "warning", swatchClass: "bg-warning", daylight: "#B7791F", ink: "#E3A53A" },
  { name: "warning-tint", swatchClass: "bg-warning-tint", daylight: "#F4EBD7", ink: "#3E311B" },
  { name: "danger", swatchClass: "bg-danger", daylight: "#B0331F", ink: "#EE7A63" },
  { name: "danger-tint", swatchClass: "bg-danger-tint", daylight: "#F3DED8", ink: "#402A21" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-hairline py-12">
      <h2 className="font-ui text-label uppercase tracking-widest text-ink-3">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <main className="mx-auto max-w-content px-6 py-16">
      <header className="pb-8">
        <h1 className="font-display text-display-xl text-ink">
          Pressroom styleguide
        </h1>
        <p className="mt-2 font-ui text-body text-ink-2">
          Internal reference for the Pressroom design system. Not linked from the
          app.
        </p>
      </header>

      <Section title="Palette">
        <p className="mb-6 font-ui text-body-sm text-ink-2">
          Each swatch fills with the live token (current theme); the labels show
          Daylight / Ink hex values.
        </p>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-6">
          {PALETTE.map((c) => (
            <Swatch key={c.name} {...c} />
          ))}
        </div>
      </Section>
      <Section title="Type scale">{null}</Section>
      <Section title="Buttons">{null}</Section>
      <Section title="Consent chips">{null}</Section>
      <Section title="ProofCard">{null}</Section>
    </main>
  );
}
