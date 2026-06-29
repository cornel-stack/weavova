"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Check,
  Copy,
  CreditCard,
  Link2,
  type LucideIcon,
  Mail,
  ShoppingBag,
} from "lucide-react";
import { contrastOn, isHexColor } from "@/lib/brand-kit";
import {
  DEFAULT_CONSENT_VERSION,
  PROMPT_SET_OPTIONS,
  type RequestChannel,
  type RequestTrigger,
  defaultConsentLine,
} from "@/lib/requests";
import { createAndSendRequest, saveTemplate } from "../actions";

// PORT: 06 _ Request builder. The merchant configures a reusable ask and Saves it (the primary
// action). TRIGGER model (D5 / P-XIII): "Manual link" is the ONLY wired trigger — Shopify/Stripe/
// Calendly are visibly present but NOT wired (honest "coming" states; selecting one explains the
// deferred automation and disables Save). A saved template fires nothing (the webhook/Sources
// bridge is deferred). With Manual link, the merchant can also CREATE A SHAREABLE LINK now — that
// reuses the SAME createAndSendRequest path as screen 23 (no duplicate send path). The "CUSTOMER
// SEES" preview reflects the chosen prompt + consent line (the customer is the headline, P-II).

const TRIGGER_META: Record<
  RequestTrigger,
  { label: string; icon: LucideIcon; wired: boolean; banner: string }
> = {
  manual_link: {
    label: "Manual link",
    icon: Link2,
    wired: true,
    banner:
      "You'll get a shareable link to send yourself — nothing sends automatically.",
  },
  shopify: {
    label: "Shopify",
    icon: ShoppingBag,
    wired: false,
    banner:
      "Coming soon — automatic sending when an order is fulfilled in Shopify isn't wired yet.",
  },
  stripe: {
    label: "Stripe",
    icon: CreditCard,
    wired: false,
    banner:
      "Coming soon — automatic sending after a Stripe payment isn't wired yet.",
  },
  calendly: {
    label: "Calendly",
    icon: Calendar,
    wired: false,
    banner:
      "Coming soon — automatic sending after a Calendly booking isn't wired yet.",
  },
};
const TRIGGER_ORDER: RequestTrigger[] = [
  "shopify",
  "stripe",
  "calendly",
  "manual_link",
];

export function RequestBuilder({
  workspaceName,
  brand,
}: {
  workspaceName: string;
  brand: { logoAssetUrl: string | null; brandColor: string | null } | null;
}) {
  const router = useRouter();
  const [trigger, setTrigger] = useState<RequestTrigger>("manual_link");
  const [promptIdx, setPromptIdx] = useState(0);
  const [channel, setChannel] = useState<RequestChannel>("email");
  const [sendTiming, setSendTiming] = useState("On demand");
  const [consentLine, setConsentLine] = useState(
    defaultConsentLine(workspaceName),
  );
  const [error, setError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const prompt = PROMPT_SET_OPTIONS[promptIdx];
  const wired = TRIGGER_META[trigger].wired;
  const brandColor = isHexColor(brand?.brandColor ?? "")
    ? (brand!.brandColor as string)
    : "#1C1714";

  function onSave() {
    setError(null);
    startTransition(async () => {
      const res = await saveTemplate({
        name: prompt,
        prompt,
        triggerType: trigger,
        deliveryChannel: channel,
        sendTiming,
        consentLine,
        consentVersion: DEFAULT_CONSENT_VERSION,
      });
      if (res.status === "invalid") {
        setError(res.reason);
        return;
      }
      router.push("/app/requests");
    });
  }

  function onCreateLink() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      const res = await createAndSendRequest({ channel: "link" });
      if (res.status === "invalid") {
        setError(res.reason);
        return;
      }
      // remaining variants (ok | sent_failed) all carry the usable link
      setLinkUrl(res.captureUrl);
    });
  }

  async function copyLink() {
    if (!linkUrl) return;
    try {
      await navigator.clipboard.writeText(linkUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/app/requests"
            className="inline-flex items-center gap-1.5 font-ui text-body-sm text-ink-2 transition-colors duration-200 ease-pressroom hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
            Requests
          </Link>
          <h1 className="mt-2 font-display text-display-lg text-ink">
            New request
          </h1>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={!wired || pending}
          title={
            wired ? undefined : "Automatic triggers are coming soon."
          }
          className="inline-flex items-center gap-2 rounded-control bg-persimmon px-4 py-2.5 font-ui text-body-sm font-medium text-on-accent transition-colors duration-200 ease-pressroom hover:bg-persimmon-deep disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {pending ? "Saving…" : "Save template"}
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        {/* ── the form ──────────────────────────────────────────────────── */}
        <div className="rounded-clip border border-hairline bg-card p-6 shadow-clip">
          {/* TRIGGER */}
          <Label>Trigger &mdash; who gets this &amp; when</Label>
          <div className="mt-3 flex flex-wrap gap-2">
            {TRIGGER_ORDER.map((t) => {
              const meta = TRIGGER_META[t];
              const Icon = meta.icon;
              const active = trigger === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTrigger(t)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 rounded-pill border px-3 py-1.5 font-ui text-body-sm transition-colors duration-200 ease-pressroom focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                    active
                      ? "border-persimmon bg-persimmon-tint text-persimmon-deep"
                      : "border-hairline text-ink-2 hover:bg-sunken"
                  } ${meta.wired ? "" : "opacity-70"}`}
                >
                  <Icon className="size-3.5" strokeWidth={1.5} aria-hidden />
                  {meta.label}
                  {!meta.wired && (
                    <span className="rounded-pill bg-sunken px-1.5 py-0.5 font-ui text-label uppercase tracking-wide text-ink-3">
                      soon
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p
            className={`mt-3 rounded-control px-4 py-3 font-ui text-body-sm ${
              wired
                ? "bg-sunken text-ink-2"
                : "bg-persimmon-tint text-persimmon-deep"
            }`}
          >
            {TRIGGER_META[trigger].banner}
          </p>

          {/* PROMPT SET */}
          <Label className="mt-6">Prompt set</Label>
          <div className="mt-3 flex flex-wrap gap-2">
            {PROMPT_SET_OPTIONS.map((p, i) => (
              <button
                key={p}
                type="button"
                onClick={() => setPromptIdx(i)}
                aria-pressed={i === promptIdx}
                className={`rounded-pill border px-3 py-1.5 font-ui text-body-sm transition-colors duration-200 ease-pressroom focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                  i === promptIdx
                    ? "border-persimmon bg-persimmon-tint text-persimmon-deep"
                    : "border-hairline text-ink-2 hover:bg-sunken"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* DELIVERY CHANNEL */}
          <Label className="mt-6">Delivery channel</Label>
          <div className="mt-3 inline-flex gap-2">
            <ChannelTab
              active={channel === "email"}
              onClick={() => setChannel("email")}
              icon={<Mail className="size-4" aria-hidden />}
              label="Email"
            />
            <ChannelTab
              active={channel === "link"}
              onClick={() => setChannel("link")}
              icon={<Link2 className="size-4" aria-hidden />}
              label="Link"
            />
          </div>

          {/* SEND TIMING */}
          <Label className="mt-6" htmlFor="send-timing">
            Send timing
          </Label>
          <input
            id="send-timing"
            value={sendTiming}
            onChange={(e) => setSendTiming(e.target.value)}
            placeholder="e.g. 3 days after fulfillment"
            className="mt-3 w-full rounded-control border border-rule bg-paper px-3 py-2.5 font-ui text-body-sm text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          />

          {/* CONSENT LINE */}
          <div className="mt-6 flex items-baseline justify-between">
            <Label htmlFor="consent-line">Consent line</Label>
            <span className="font-ui text-label uppercase tracking-wide text-ink-3">
              versioned · {DEFAULT_CONSENT_VERSION}
            </span>
          </div>
          <textarea
            id="consent-line"
            value={consentLine}
            onChange={(e) => setConsentLine(e.target.value)}
            rows={2}
            className="mt-3 w-full resize-none rounded-control border border-rule bg-paper px-3 py-2.5 font-ui text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          />

          {error && (
            <p role="alert" className="mt-4 font-ui text-body-sm text-danger">
              {error}
            </p>
          )}

          {/* Manual-link create (T016) — reuses the SAME send path as screen 23. */}
          {wired && (
            <div className="mt-6 border-t border-hairline pt-5">
              {linkUrl ? (
                <div className="flex items-center gap-2 rounded-control border border-hairline bg-paper px-3 py-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-mono-sm text-ink-2">
                    {linkUrl}
                  </span>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-control border border-rule bg-card px-3 py-1.5 font-ui text-body-sm font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    {copied ? (
                      <Check className="size-4" aria-hidden />
                    ) : (
                      <Copy className="size-4" aria-hidden />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onCreateLink}
                  disabled={pending}
                  className="inline-flex items-center gap-2 rounded-control border border-rule bg-card px-4 py-2.5 font-ui text-body-sm font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <Link2 className="size-4" strokeWidth={1.5} aria-hidden />
                  Create a shareable link now
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── CUSTOMER SEES preview ─────────────────────────────────────── */}
        <aside>
          <p className="text-center font-ui text-label uppercase tracking-wide text-ink-3">
            Customer sees
          </p>
          <CustomerPreview
            workspaceName={workspaceName}
            brand={brand}
            brandColor={brandColor}
            consentLine={consentLine}
          />
        </aside>
      </div>
    </div>
  );
}

// A presentational mini capture-prompt (mirrors capture screen 01/04). NOT the live capture
// component — the public /c/[token] page is untouched. Generic headline (no fabricated name/
// product, P-XIV).
function CustomerPreview({
  workspaceName,
  brand,
  brandColor,
  consentLine,
}: {
  workspaceName: string;
  brand: { logoAssetUrl: string | null } | null;
  brandColor: string;
  consentLine: string;
}) {
  const onBrand = contrastOn(brandColor);
  return (
    <div className="mt-3 rounded-modal border-4 border-ink bg-paper p-5">
      <div className="flex justify-center py-2">
        {brand?.logoAssetUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logoAssetUrl}
            alt={workspaceName}
            className="h-8 max-w-[120px] object-contain"
          />
        ) : (
          <span
            className="flex size-8 items-center justify-center rounded-control font-display text-body-sm"
            style={{ backgroundColor: brandColor, color: onBrand }}
            aria-hidden
          >
            {workspaceName.charAt(0)}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-center font-display text-display-xs text-ink">
        How was it?
      </h3>
      <div
        className="mt-5 flex items-center justify-center gap-2 rounded-control px-4 py-2.5 font-ui text-body-sm font-medium"
        style={{ backgroundColor: brandColor, color: onBrand }}
      >
        Record a quick video
      </div>
      <p className="mt-3 text-center font-ui text-label text-ink-3">
        Write it · Add a photo · Record audio
      </p>
      <div className="mt-5 flex items-start gap-2 border-t border-hairline pt-4">
        <span className="mt-0.5 size-3.5 shrink-0 rounded-[3px] border border-rule" aria-hidden />
        <p className="font-ui text-label text-ink-2">{consentLine}</p>
      </div>
      <p className="mt-4 text-center font-ui text-label uppercase tracking-wide text-ink-3">
        powered by Weavova
      </p>
    </div>
  );
}

function Label({
  children,
  className = "",
  htmlFor,
}: {
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block font-ui text-label uppercase tracking-wide text-ink-3 ${className}`}
    >
      {children}
    </label>
  );
}

function ChannelTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-control px-3 py-1.5 font-ui text-body-sm font-medium transition-colors duration-200 ease-pressroom focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
        active
          ? "border border-rule bg-card text-ink shadow-clip"
          : "border border-transparent text-ink-2 hover:bg-sunken"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
