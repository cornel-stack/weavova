import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ProofCard } from "@/components/proof-card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  getDefaultWorkspace,
  getOrCreateWebhookEndpoint,
  getProofs,
  listCaptureRequests,
} from "@/db/queries";

// The native source connectors are the deferred Sources track (native OAuth). They are
// honest "coming" states (P-XIII) — anything they would do today goes through the generic
// webhook below (Zapier/Make/n8n bridge them onto POST /api/ingest).
const NATIVE_SOURCES_COMING = ["Shopify", "Stripe", "Calendly"] as const;

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

  // T7.4 — the workspace's REAL webhook endpoint. The secret genuinely authenticates POST
  // /api/ingest (P-XIII — not decorative): a request minted by posting to this URL with this
  // header is indistinguishable from a T7.3 link. Shown here on the dev surface (the minimal
  // honest spot; a real Settings home is T9). The absolute URL is derived from the request host.
  const endpoint = await getOrCreateWebhookEndpoint(workspace.id);
  const host = (await headers()).get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const webhookUrl = `${proto}://${host}/api/ingest`;

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

      {/* T7.4 — the workspace's real webhook endpoint (the universal door). The secret
          authenticates POST /api/ingest; generic webhook is LIVE, native connectors coming. */}
      <section className="mb-12 rounded-clip border border-hairline bg-card p-6 shadow-clip">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-ui text-label uppercase tracking-wide text-ink-3">
            Inbound webhook · POST /api/ingest
          </h2>
          <span className="rounded-pill bg-success-tint px-2 py-0.5 font-ui text-label uppercase tracking-wide text-success">
            Live
          </span>
        </div>
        <p className="mt-3 max-w-prose font-ui text-body-sm text-ink-2">
          Point any platform here — Zapier, Make, or n8n can bridge a Shopify
          order, a Stripe payment, or a Calendly booking onto the generic
          payload. Each valid event mints a capture link automatically.
        </p>
        <dl className="mt-4 space-y-3">
          <div>
            <dt className="font-ui text-label uppercase tracking-wide text-ink-3">
              Endpoint
            </dt>
            <dd className="mt-1 font-mono text-mono text-ink">{webhookUrl}</dd>
          </div>
          <div>
            <dt className="font-ui text-label uppercase tracking-wide text-ink-3">
              Auth header
            </dt>
            <dd className="mt-1 break-all font-mono text-mono text-ink">
              X-Weavova-Webhook-Secret: {endpoint.secret}
            </dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="font-ui text-label uppercase tracking-wide text-ink-3">
            Native connectors
          </span>
          {NATIVE_SOURCES_COMING.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 rounded-pill border border-hairline bg-sunken px-2.5 py-0.5 font-ui text-body-sm text-ink-2"
            >
              {name}
              <span className="font-ui text-label uppercase tracking-wide text-ink-3">
                Coming
              </span>
            </span>
          ))}
        </div>
      </section>

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
