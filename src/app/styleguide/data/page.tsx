import { ProofCard } from "@/components/proof-card";
import { ThemeToggle } from "@/components/theme-toggle";
import { getProofs } from "@/db/queries";

// Dynamic + the lazy db client → CI/static build is green without DATABASE_URL;
// real data is read at request time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Styleguide · Data — Weavova",
};

export default async function StyleguideDataPage() {
  const proofs = await getProofs();

  return (
    <main className="mx-auto max-w-content px-6 py-16">
      <header className="flex items-start justify-between gap-4 pb-8">
        <div>
          <h1 className="font-display text-display-xl text-ink">
            Real proof from Neon
          </h1>
          <p className="mt-2 font-ui text-body text-ink-2">
            {proofs.length} proofs read live via getProofs(), rendered with the
            T0.2 ProofCard. Internal — not linked from the app.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        {proofs.map((p) => (
          <ProofCard key={p.id} {...p} />
        ))}
      </div>
    </main>
  );
}
