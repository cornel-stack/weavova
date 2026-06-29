import { notFound } from "next/navigation";
import { ProofCard } from "@/components/proof-card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  getDefaultWorkspace,
  getProofs,
  listCaptureRequests,
} from "@/db/queries";

// Dynamic + the lazy db client → CI/static build is green without DATABASE_URL;
// real data is read at request time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Styleguide · Data — Weavova",
};

export default async function StyleguideDataPage() {
  // T6: this is a DEV-ONLY harness, not a product surface, and it sits OUTSIDE /app/*
  // (the middleware gate does not cover it). It is excluded from production, and reads
  // the default workspace DIRECTLY (its pre-T6 behaviour) instead of the session seam,
  // so it needs no auth/session. (Deliberately removed from the session seam — plan §6.)
  if (process.env.NODE_ENV === "production") notFound();
  const workspace = await getDefaultWorkspace();
  if (!workspace) notFound();
  const proofs = await getProofs(workspace.id);
  // T7.2 — dev-only capture-request links (C1 = link-only; QR is deferred to the merchant
  // request surface, T7.4). Webhook + Resend send are T7.3. Copy a link to walk /c/[token].
  const captureRequests = await listCaptureRequests(workspace.id);

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

      {/* T7.2 — seeded capture-request links (dev only). */}
      <section className="mb-12 rounded-clip border border-hairline bg-card p-6 shadow-clip">
        <h2 className="font-ui text-label uppercase tracking-wide text-ink-3">
          Capture links · /c/[token]
        </h2>
        <ul className="mt-4 space-y-2">
          {captureRequests.map((r) => (
            <li
              key={r.token}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 font-ui text-body-sm text-ink-2"
            >
              <a
                href={`/c/${r.token}`}
                className="font-mono text-mono text-ink underline-offset-2 hover:underline"
              >
                /c/{r.token}
              </a>
              <span className="rounded-pill bg-sunken px-2 py-0.5 font-ui text-label uppercase tracking-wide text-ink-3">
                {r.status}
              </span>
              {r.customerName && <span>{r.customerName}</span>}
              <span className="text-ink-3">expires {r.expiresAt.slice(0, 10)}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        {proofs.map((p) => (
          <ProofCard key={p.id} {...p} />
        ))}
      </div>
    </main>
  );
}
