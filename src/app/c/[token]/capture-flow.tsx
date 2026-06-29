"use client";

import { useState, useTransition } from "react";
import { contrastOn, isHexColor } from "@/lib/brand-kit";
import type { NameDisplay } from "@/lib/consent";
import type { CaptureProofPath, CaptureRequestView } from "@/lib/capture";
import { submitCapture } from "./actions";

// The public capture flow (T7.2 — a faithful PORT of design-reference/Weavova/Capture/).
// Client state machine. Increment 1 wires the TEXT path (prompt 01 → write 07 → consent
// 04 → sending 05 → thanks 06); VIDEO/photo/audio are honest "coming" states (P-XIII) —
// video lands in Increment 2. The customer's words are stored verbatim (testimony-
// verbatim); consent is a real T7.1 granted version (organic-only) written server-side.
// The page wears the workspace BRAND COLOUR (the documented P-IV exception for this
// brand-owned surface — persimmon is Weavova chrome; here the merchant's colour leads the
// primary action; "powered by Weavova" is the only Weavova mark). No verified stamp.

type Screen = "prompt" | "write" | "consent" | "sending" | "thanks" | "coming";

// privacy rank — higher = more private (mirrors resolveDisplay; the customer may only
// pick a name option at-or-more-private than the workspace default).
const NAME_RANK: Record<NameDisplay, number> = {
  full: 0,
  first_initial: 1,
  anonymous: 2,
};
const NAME_OPTIONS: { value: NameDisplay; label: string }[] = [
  { value: "full", label: "My full name" },
  { value: "first_initial", label: "First name + initial" },
  { value: "anonymous", label: "Keep me anonymous" },
];

function firstName(name: string | null): string | null {
  if (!name) return null;
  return name.trim().split(/\s+/)[0] || null;
}

export function CaptureFlow({ request }: { request: CaptureRequestView }) {
  const [screen, setScreen] = useState<Screen>("prompt");
  const [text, setText] = useState("");
  const [nameDisplay, setNameDisplay] = useState<NameDisplay>(
    request.display.nameDisplay,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const brandColor = isHexColor(request.brand?.brandColor ?? "")
    ? request.brand!.brandColor
    : "#1C1714"; // honest fallback = ink (no fabricated colour)
  const onBrand = contrastOn(brandColor);
  const fname = firstName(request.customerName);
  const ws = request.workspaceName;

  // The brand-coloured primary button style (the documented P-IV exception, above).
  const primary = { backgroundColor: brandColor, color: onBrand } as const;

  function choosePath(path: CaptureProofPath) {
    setError(null);
    if (path === "text") setScreen("write");
    else setScreen("coming"); // video/photo/audio — honest coming (Increment 2 / T7.2b)
  }

  function send() {
    setError(null);
    setScreen("sending");
    startTransition(async () => {
      const res = await submitCapture({
        token: request.token,
        path: "text",
        text,
        // text proof carries no face → send only the name override (more-private-only;
        // the server clamps via resolveDisplay against the workspace floor).
        displayOverride: { nameDisplay },
      });
      if (res.status === "ok") {
        setScreen("thanks");
      } else if (res.status === "invalid") {
        setError(res.reason);
        setScreen("write");
      } else {
        // used / expired / not_found / error — honest message; the link is spent.
        setError(
          res.status === "error"
            ? `We couldn't save that just now. Ask ${ws} for a fresh link.`
            : `This link is no longer open. Ask ${ws} for a new one.`,
        );
        setScreen("write");
      }
    });
  }

  return (
    <main className="flex min-h-dvh flex-col items-center bg-paper px-6 py-10">
      <div className="flex w-full max-w-[440px] flex-1 flex-col">
        {/* brand mark — real logo or an honest monogram in the brand colour */}
        <header className="flex justify-center py-4">
          {request.brand?.logoAssetUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={request.brand.logoAssetUrl}
              alt={ws}
              className="h-10 max-w-[180px] object-contain"
            />
          ) : (
            <span
              className="flex size-10 items-center justify-center rounded-pill font-display text-display-xs"
              style={primary}
              aria-hidden
            >
              {ws.charAt(0)}
            </span>
          )}
        </header>

        <div className="flex flex-1 flex-col justify-center py-6">
          {/* ── PORT: 01 _ Prompt ───────────────────────────────────────── */}
          {screen === "prompt" && (
            <section className="text-center">
              <h1 className="font-display text-display-lg text-ink">
                {fname ? `How was it, ${fname}?` : `How was it?`}
              </h1>
              <p className="mt-3 font-ui text-body text-ink-2">
                A few honest words is all it takes. Takes about 20 seconds.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <PromptOption
                  label="Record a quick video"
                  wired={request.wiredPaths.includes("video")}
                  onClick={() => choosePath("video")}
                  primaryStyle={primary}
                />
                <PromptOption
                  label="Write it"
                  wired={request.wiredPaths.includes("text")}
                  onClick={() => choosePath("text")}
                  primaryStyle={primary}
                />
                <PromptOption
                  label="Add a photo"
                  wired={request.wiredPaths.includes("photo")}
                  onClick={() => choosePath("photo")}
                  primaryStyle={primary}
                />
                <PromptOption
                  label="Record audio"
                  wired={request.wiredPaths.includes("audio")}
                  onClick={() => choosePath("audio")}
                  primaryStyle={primary}
                />
              </div>
            </section>
          )}

          {/* ── PORT: 07 _ Write it ─────────────────────────────────────── */}
          {screen === "write" && (
            <section>
              <h1 className="font-display text-display-md text-ink">
                In your own words —
              </h1>
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder="What stood out? What would you tell a friend?"
                className="mt-5 w-full resize-none rounded-clip border border-rule bg-card px-4 py-3 font-display text-quote text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              />
              {error && (
                <p role="alert" className="mt-3 font-ui text-body-sm text-danger">
                  {error}
                </p>
              )}
              <button
                type="button"
                disabled={text.trim().length === 0}
                onClick={() => {
                  setError(null);
                  setScreen("consent");
                }}
                style={primary}
                className="mt-6 w-full rounded-control px-5 py-3.5 font-ui text-body font-medium transition-opacity duration-200 ease-pressroom disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Use this
              </button>
              <BackLink onClick={() => setScreen("prompt")} />
            </section>
          )}

          {/* ── PORT: 04 _ Consent ──────────────────────────────────────── */}
          {screen === "consent" && (
            <section>
              <h1 className="font-display text-display-md text-ink">
                One last thing.
              </h1>
              <p className="mt-4 font-ui text-body text-ink">
                I&rsquo;m happy for {ws} to share this in their marketing.
              </p>

              {/* How you'll appear — pre-filled from the workspace default; the customer
                  may only move toward MORE privacy (less-private options disabled). For a
                  written testimonial there's no face, so only the name choice is shown;
                  the server clamps via resolveDisplay. */}
              <fieldset className="mt-6">
                <legend className="font-ui text-label uppercase tracking-wide text-ink-3">
                  How you&rsquo;ll appear
                </legend>
                <div className="mt-3 flex flex-col gap-2">
                  {NAME_OPTIONS.map((opt) => {
                    const allowed =
                      NAME_RANK[opt.value] >=
                      NAME_RANK[request.display.nameDisplay];
                    return (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-3 rounded-control border px-4 py-2.5 font-ui text-body-sm ${
                          nameDisplay === opt.value
                            ? "border-ink bg-card text-ink"
                            : "border-hairline text-ink-2"
                        } ${allowed ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}
                      >
                        <input
                          type="radio"
                          name="nameDisplay"
                          className="accent-ink"
                          checked={nameDisplay === opt.value}
                          disabled={!allowed}
                          onChange={() => setNameDisplay(opt.value)}
                        />
                        {opt.label}
                        {!allowed && (
                          <span className="ml-auto font-ui text-label text-ink-3">
                            set by {ws}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <FullTerms workspaceName={ws} />

              <p className="mt-4 font-ui text-body-sm text-ink-3">
                Changed your mind later? Ask {ws} and they&rsquo;ll take it down.
              </p>

              <button
                type="button"
                onClick={send}
                style={primary}
                className="mt-6 w-full rounded-control px-5 py-3.5 font-ui text-body font-medium transition-opacity duration-200 ease-pressroom focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Send to {ws}
              </button>
              <BackLink onClick={() => setScreen("write")} />
            </section>
          )}

          {/* ── PORT: 05 _ Sending ──────────────────────────────────────── */}
          {screen === "sending" && (
            <section className="text-center" aria-live="polite">
              <p className="font-display text-display-md text-ink">Sending&hellip;</p>
              <p className="mt-3 font-ui text-body-sm text-ink-3">
                {pending ? "One moment." : "Almost there."}
              </p>
            </section>
          )}

          {/* ── PORT: 06 _ Thank-you ────────────────────────────────────── */}
          {screen === "thanks" && (
            <section className="text-center">
              <h1 className="font-display text-display-lg text-ink">
                {fname ? `Thank you, ${fname}.` : "Thank you."}
              </h1>
              <p className="mt-3 font-ui text-body text-ink-2">
                Your words mean a lot to us.
              </p>
              <p className="mt-6 font-display text-display-xs text-ink">&mdash; {ws}</p>
              {/* The "Follow {brand} →" affordance is omitted until a real brand social
                  URL exists — an honest absence beats a dead control (P-XIII). */}
            </section>
          )}

          {/* honest "coming" state for video/photo/audio (P-XIII — not a dead control) */}
          {screen === "coming" && (
            <section className="text-center">
              <h1 className="font-display text-display-md text-ink">
                Coming soon.
              </h1>
              <p className="mt-3 font-ui text-body text-ink-2">
                Video, photo, and audio capture are on the way. For now, a few written
                words work just as well.
              </p>
              <button
                type="button"
                onClick={() => setScreen("write")}
                style={primary}
                className="mt-7 w-full rounded-control px-5 py-3.5 font-ui text-body font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Write it instead
              </button>
              <BackLink onClick={() => setScreen("prompt")} />
            </section>
          )}
        </div>

        <footer className="py-4 text-center">
          <span className="font-ui text-label uppercase tracking-wide text-ink-3">
            powered by Weavova
          </span>
        </footer>
      </div>
    </main>
  );
}

// A prompt option (screen 01). Wired options act; unwired show an honest "soon" tag and
// route to the coming state — never dead (P-XIII).
function PromptOption({
  label,
  wired,
  onClick,
  primaryStyle,
}: {
  label: string;
  wired: boolean;
  onClick: () => void;
  primaryStyle: { backgroundColor: string; color: string };
}) {
  if (wired) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={primaryStyle}
        className="w-full rounded-control px-5 py-3.5 font-ui text-body font-medium transition-opacity duration-200 ease-pressroom hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-control border border-hairline bg-card px-5 py-3.5 font-ui text-body text-ink-2 transition-colors duration-200 ease-pressroom hover:border-rule focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {label}
      <span className="rounded-pill bg-sunken px-2 py-0.5 font-ui text-label uppercase tracking-wide text-ink-3">
        soon
      </span>
    </button>
  );
}

// "Read the full terms" — an honest inline disclosure of the real, owned consent terms
// (never a dead link). Plain-language; what the customer is agreeing to.
function FullTerms({ workspaceName }: { workspaceName: string }) {
  return (
    <details className="mt-5 rounded-control border border-hairline bg-card px-4 py-3">
      <summary className="cursor-pointer font-ui text-body-sm font-medium text-ink">
        Read the full terms
      </summary>
      <div className="mt-3 space-y-2 font-ui text-body-sm text-ink-2">
        <p>
          You&rsquo;re giving {workspaceName} permission to use what you share here
          &mdash; your words, and any video, photo, or audio &mdash; in their marketing
          (for example, social posts).
        </p>
        <p>
          You can choose how you appear (your name, or anonymous). Your consent is
          recorded with a date and version, and you can withdraw it at any time by asking
          {" "}
          {workspaceName} &mdash; they&rsquo;ll stop using it and take down what they can.
        </p>
        <p>
          {workspaceName} won&rsquo;t change your words. Nothing here is shared with anyone
          else.
        </p>
      </div>
    </details>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 w-full text-center font-ui text-body-sm text-ink-3 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      Back
    </button>
  );
}
