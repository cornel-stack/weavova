import type { ReactNode } from "react";

export const metadata = {
  title: "Styleguide — Weavova",
};

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

      <Section title="Palette">{null}</Section>
      <Section title="Type scale">{null}</Section>
      <Section title="Buttons">{null}</Section>
      <Section title="Consent chips">{null}</Section>
      <Section title="ProofCard">{null}</Section>
    </main>
  );
}
