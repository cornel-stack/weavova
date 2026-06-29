"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Copy, Link2, Mail, MessageSquarePlus, X } from "lucide-react";
import { createAndSendRequest } from "@/app/app/requests/actions";
import {
  type CreateAndSendResult,
  type RequestChannel,
  askForMoreMessage,
  firstNameOf,
  looksLikeEmail,
} from "@/lib/requests";

// PORT: 23 _ Ask this customer for more. The person-driven manual send (US1, the loop-closer):
// a modal launched from the proof detail, pre-addressed to that proof's customer. Email (Resend)
// or Link (copyable /c/[token]). The send is MINT-THEN-BEST-EFFORT (D3) — a Resend failure is
// shown honestly ("created, not emailed; copy the link"), never a false "sent". No customer email
// is stored anywhere (C7), so the Email path requires the merchant to type the address.

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || name.slice(0, 2).toUpperCase()
  );
}

export function AskForMore({
  proofId,
  customerName,
  sourceLabel,
}: {
  proofId: string;
  customerName: string;
  sourceLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-control border border-rule bg-card px-4 py-2.5 font-ui text-body-sm font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <MessageSquarePlus className="size-4" strokeWidth={1.5} aria-hidden />
        Ask this customer for more
      </button>
      {open && (
        <AskForMoreModal
          proofId={proofId}
          customerName={customerName}
          sourceLabel={sourceLabel}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function AskForMoreModal({
  customerName,
  sourceLabel,
  onClose,
}: {
  proofId: string;
  customerName: string;
  sourceLabel: string;
  onClose: () => void;
}) {
  const [channel, setChannel] = useState<RequestChannel>("email");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(
    askForMoreMessage(firstNameOf(customerName)),
  );
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateAndSendResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = "ask-for-more-title";

  // Focus the dialog on open; Escape closes; basic Tab focus-trap within the dialog.
  useEffect(() => {
    dialogRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function submit() {
    setError(null);
    if (channel === "email" && !looksLikeEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    startTransition(async () => {
      const res = await createAndSendRequest({
        channel,
        recipientEmail: channel === "email" ? email : undefined,
        customerName,
        message,
      });
      if (res.status === "invalid") {
        setError(res.reason);
        return;
      }
      setResult(res);
    });
  }

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const sentOk = result?.status === "ok" && result.channel === "email";
  const linkUrl =
    result && result.status !== "invalid" ? result.captureUrl : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] rounded-modal bg-card p-6 shadow-modal outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id={titleId}
              className="font-display text-display-sm text-ink"
            >
              Ask for more
            </h2>
            <p className="mt-1 font-ui text-body-sm text-ink-3">
              Send a follow-up to {customerName}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 flex size-8 items-center justify-center rounded-pill text-ink-2 transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {/* customer card */}
        <div className="mt-5 flex items-center gap-3 rounded-control border border-hairline bg-paper px-4 py-3">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-sunken font-ui text-body-sm font-medium text-ink-2"
            aria-hidden
          >
            {initials(customerName)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-ui text-body-sm font-medium text-ink">
              {customerName}
            </p>
            <p className="truncate font-mono text-mono-sm text-ink-3">
              {sourceLabel}
            </p>
          </div>
        </div>

        {result ? (
          // ── Honest result states (T009) ─────────────────────────────────
          <div className="mt-5">
            {sentOk && (
              <p className="flex items-center gap-2 font-ui text-body-sm text-success">
                <Check className="size-4" aria-hidden />
                Sent to {email}.
              </p>
            )}
            {result.status === "sent_failed" && (
              <p role="alert" className="font-ui text-body-sm text-danger">
                The request is ready, but the email couldn&rsquo;t be sent. Copy
                the link below and share it, or try again.
              </p>
            )}
            {result.status === "ok" && result.channel === "link" && (
              <p className="font-ui text-body-sm text-ink-2">
                Your capture link is ready — copy and share it.
              </p>
            )}
            {linkUrl && (
              <div className="mt-3 flex items-center gap-2 rounded-control border border-hairline bg-paper px-3 py-2">
                <span className="min-w-0 flex-1 truncate font-mono text-mono-sm text-ink-2">
                  {linkUrl}
                </span>
                <button
                  type="button"
                  onClick={() => copyLink(linkUrl)}
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
            )}
            <div className="mt-6 flex justify-end gap-3">
              {result.status === "sent_failed" && (
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setCopied(false);
                  }}
                  className="rounded-control border border-rule bg-card px-4 py-2.5 font-ui text-body-sm font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  Try again
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-control bg-ink px-4 py-2.5 font-ui text-body-sm font-medium text-paper transition-opacity duration-200 ease-pressroom hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          // ── Compose ──────────────────────────────────────────────────────
          <>
            <fieldset className="mt-5">
              <legend className="font-ui text-label uppercase tracking-wide text-ink-3">
                Channel
              </legend>
              <div className="mt-2 inline-flex gap-2">
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
            </fieldset>

            {channel === "email" && (
              <div className="mt-4">
                <label
                  htmlFor="ask-email"
                  className="font-ui text-label uppercase tracking-wide text-ink-3"
                >
                  Their email
                </label>
                <input
                  id="ask-email"
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="mt-2 w-full rounded-control border border-rule bg-paper px-3 py-2.5 font-ui text-body-sm text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                />
              </div>
            )}

            <div className="mt-4">
              <label
                htmlFor="ask-message"
                className="font-ui text-label uppercase tracking-wide text-ink-3"
              >
                Message
              </label>
              <textarea
                id="ask-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                className="mt-2 w-full resize-none rounded-control border border-rule bg-paper px-3 py-2.5 font-ui text-body-sm text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              />
            </div>

            {error && (
              <p role="alert" className="mt-3 font-ui text-body-sm text-danger">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-control px-4 py-2.5 font-ui text-body-sm font-medium text-ink-2 transition-colors duration-200 ease-pressroom hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-control bg-persimmon px-4 py-2.5 font-ui text-body-sm font-medium text-on-accent transition-colors duration-200 ease-pressroom hover:bg-persimmon-deep disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {channel === "email" ? (
                  <Mail className="size-4" aria-hidden />
                ) : (
                  <Link2 className="size-4" aria-hidden />
                )}
                {pending
                  ? "Working…"
                  : channel === "email"
                    ? "Send via Email"
                    : "Create link"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
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
