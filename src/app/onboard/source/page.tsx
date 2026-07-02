import Link from "next/link";
import { headers } from "next/headers";
import { getOrCreateWebhookEndpoint } from "@/db/queries";
import { getCurrentWorkspace } from "@/lib/session";
import { OnboardStepper } from "@/components/app/onboarding/onboard-stepper";
import { OnboardFooter, onboardPrimaryClass } from "@/components/app/onboarding/onboard-footer";

export const dynamic = "force-dynamic";

// T6.2 · Step 2 — Connect a source. PORT of design "2 _ Connect a source  _onboard_source".
// READINESS (P-XIII): the generic WEBHOOK path is REAL (reuses the T7.4 endpoint — the secret
// genuinely authenticates POST /api/ingest, NOT decorative, NOT duplicated). Native connectors
// (Shopify/Stripe/Instagram) + the other integration cards are honest "COMING" states (the
// deferred Sources track) — no dead controls, no fake success, NO OAuth built here. The Sources
// track later attaches OAuth behind these same cards. No write on this step (you can "just use
// a link"), so Continue is always available.

// Honest "coming" affordances (the T7.3 request-builder pattern). Descriptions are verbatim
// from the design; every card is a "coming" state (the deferred Sources track), never a dead
// control and never a fake connection. NOTE (deliberate P-XIV omissions vs the design): the
// design's "Ranked for {type}" line and the "~2 min" setup-time badges are dropped — we don't
// claim a ranking we don't compute, nor a setup time for a connector that isn't wired.
const COMING = [
  { name: "Shopify", tag: "Recommended", note: "Fires after an order is fulfilled." },
  { name: "Stripe", tag: null, note: "Fires after a successful payment." },
  { name: "Instagram", tag: null, note: "Pulls tagged mentions & DMs." },
  {
    name: "Forward order emails",
    tag: null,
    note: "Auto-forward confirmation emails to your private inbox address. Weavova reads the name, email and product.",
  },
  {
    name: "Thank-you page or QR",
    tag: null,
    note: "Drop a snippet on your checkout success page, or print a QR on the packaging insert. The customer self-starts.",
  },
  {
    name: "Ask after delivery",
    tag: null,
    note: "AfterShip, Shippo or EasyPost — ask the instant the parcel lands, not at checkout.",
  },
];

export default async function OnboardSourcePage() {
  const ws = await getCurrentWorkspace();
  const endpoint = await getOrCreateWebhookEndpoint(ws.id);
  const host = (await headers()).get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const webhookUrl = `${proto}://${host}/api/ingest`;

  return (
    <div>
      <OnboardStepper current={2} />
      <h1 className="mt-8 font-display text-display-lg text-ink">
        Where should proof come from?
      </h1>
      <p className="mt-2 font-ui text-body text-ink-2">
        Connect one now, or just use a link.
      </p>

      {/* The REAL path — the generic webhook (LIVE). Reuses the workspace's T7.4 endpoint. */}
      <section className="mt-8 rounded-clip border border-hairline bg-card p-6 shadow-clip">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-ui text-heading-md text-ink">Automation · works with anything</h2>
          <span className="rounded-pill bg-success-tint px-2 py-0.5 font-ui text-label uppercase tracking-wide text-success">
            Live
          </span>
        </div>
        <p className="mt-2 max-w-prose font-ui text-body-sm text-ink-2">
          Point a Zap from Zapier, Make, n8n or Pipedream at one Weavova webhook — any of
          6,000+ apps. Each valid event mints a capture link automatically.
        </p>
        <dl className="mt-4 space-y-3">
          <div>
            <dt className="font-ui text-label uppercase tracking-wide text-ink-3">Endpoint</dt>
            <dd className="mt-1 break-all font-mono text-mono text-ink">POST {webhookUrl}</dd>
          </div>
          <div>
            <dt className="font-ui text-label uppercase tracking-wide text-ink-3">Auth header</dt>
            <dd className="mt-1 break-all font-mono text-mono text-ink">
              X-Weavova-Webhook-Secret: {endpoint.secret}
            </dd>
          </div>
        </dl>
      </section>

      {/* Honest "coming" — native connectors + the other integration cards (Sources track). */}
      <section className="mt-6">
        <h2 className="font-ui text-label uppercase tracking-wide text-ink-3">
          Native connectors · coming
        </h2>
        <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {COMING.map((c) => (
            <li
              key={c.name}
              className="flex flex-col gap-1 rounded-clip border border-hairline bg-sunken p-4"
            >
              <div className="flex items-center gap-2">
                <span className="font-ui text-heading-sm text-ink-2">{c.name}</span>
                {c.tag && (
                  <span className="rounded-pill bg-sunken px-2 py-0.5 font-ui text-label uppercase tracking-wide text-ink-3">
                    {c.tag}
                  </span>
                )}
                <span className="ml-auto rounded-pill bg-sunken px-2 py-0.5 font-ui text-label uppercase tracking-wide text-ink-3">
                  Coming
                </span>
              </div>
              <p className="font-ui text-body-sm text-ink-3">{c.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <OnboardFooter
        step={2}
        backHref="/onboard/role"
        primary={
          <Link href="/onboard/brand" className={onboardPrimaryClass}>
            Continue
          </Link>
        }
      />
    </div>
  );
}
