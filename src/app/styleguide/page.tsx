import type { ReactNode } from "react";
import { Swatch } from "@/components/ui/swatch";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ProofCard } from "@/components/proof-card";
import type { ProofCardProps } from "@/lib/proof";

export const metadata = {
  title: "Styleguide — Weavova",
};

// Hardcoded ProofCard samples (no real people; neutral placeholders).
const PROOF_SAMPLES: ProofCardProps[] = [
  {
    id: "proof_text_1",
    customerName: "Darnell W.",
    proofType: "text",
    quote:
      "The monthly box is the only subscription I never even think about cancelling.",
    transcript: null,
    source: "Stripe",
    consentState: "granted",
    capturedAt: "2026-05-28",
    reviewed: false,
    verified: true,
  },
  {
    id: "proof_media_1",
    customerName: "Aisha K.",
    proofType: "video",
    quote: null,
    transcript:
      "Everyone who walks into my place asks what that smell is. Every single time.",
    source: "Instagram",
    consentState: "awaiting",
    thumbnail: null,
    capturedAt: "2026-06-02",
    reviewed: true,
    verified: false,
  },
];

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

// Type scale — role label, size/family classes, family name, sample.
const TYPE: { label: string; className: string; family: string; sample: string }[] = [
  { label: "display-2xl · 48/52", className: "font-display text-display-2xl", family: "Fraunces", sample: "The customer is the headline" },
  { label: "display-xl · 38/44", className: "font-display text-display-xl", family: "Fraunces", sample: "The customer is the headline" },
  { label: "display-lg · 30/36", className: "font-display text-display-lg", family: "Fraunces", sample: "The customer is the headline" },
  { label: "display-md · 24/30", className: "font-display text-display-md", family: "Fraunces", sample: "The customer is the headline" },
  { label: "display-sm · 20/26", className: "font-display text-display-sm", family: "Fraunces", sample: "The customer is the headline" },
  { label: "display-xs · 18/24", className: "font-display text-display-xs", family: "Fraunces", sample: "The customer is the headline" },
  { label: "heading-lg · 20/28", className: "font-ui text-heading-lg font-semibold", family: "Hanken Grotesk", sample: "Proof inbox" },
  { label: "heading-md · 16/22", className: "font-ui text-heading-md font-semibold", family: "Hanken Grotesk", sample: "Proof inbox" },
  { label: "heading-sm · 14/20", className: "font-ui text-heading-sm font-semibold", family: "Hanken Grotesk", sample: "Proof inbox" },
  { label: "quote · 22/32", className: "font-display text-quote", family: "Fraunces", sample: "My whole flat smells like a spa now." },
  { label: "body · 15/24", className: "font-ui text-body", family: "Hanken Grotesk", sample: "Capture real customer proof the moment it happens." },
  { label: "body-sm · 13/20", className: "font-ui text-body-sm", family: "Hanken Grotesk", sample: "Capture real customer proof the moment it happens." },
  { label: "label · 11/16", className: "font-ui text-label uppercase tracking-widest", family: "Hanken Grotesk", sample: "Verified real customer" },
  { label: "mono · 12/18", className: "font-mono text-mono", family: "JetBrains Mono", sample: "/app/proof/8f3a2c" },
  { label: "mono-sm · 11/16", className: "font-mono text-mono-sm", family: "JetBrains Mono", sample: "proof_8f3a2c9d" },
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
      <Section title="Type scale">
        <div className="flex flex-col gap-8">
          {TYPE.map((t) => (
            <div key={t.label}>
              <div className="font-mono text-mono-sm text-ink-3">
                {t.label} · {t.family}
              </div>
              <div className={`mt-1 text-ink ${t.className}`}>{t.sample}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary">Make clip</Button>
          <Button variant="strong">Review</Button>
          <Button variant="quiet">Cancel</Button>
          <Button variant="danger">Revoke consent</Button>
        </div>
        <p className="mt-4 font-ui text-body-sm text-ink-2">
          Persimmon appears on the primary action only; strong secondary is solid
          ink, quiet is an ink-hairline outline, danger is destructive.
        </p>
      </Section>
      <Section title="Consent chips">
        <div className="flex flex-wrap items-center gap-4">
          <Chip tone="success">Granted</Chip>
          <Chip tone="warning">Awaiting</Chip>
          <Chip tone="danger">Revoked</Chip>
        </div>
      </Section>
      <Section title="ProofCard">
        <p className="mb-6 font-ui text-body-sm text-ink-2">
          Hover a card to reveal the persimmon “Make” action (granted consent
          only). The proof — the customer’s words or thumbnail — is the dominant
          element.
        </p>
        <div className="grid grid-cols-1 gap-6 sm:max-w-[760px] md:grid-cols-2">
          {PROOF_SAMPLES.map((p) => (
            <ProofCard key={p.id} {...p} />
          ))}
        </div>
      </Section>
    </main>
  );
}
