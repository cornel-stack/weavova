"use client";

import { useState } from "react";
import { Scissors } from "lucide-react";
import type { ClipFormat } from "@/lib/clip";
import {
  DEFAULT_FORMAT,
  FORMAT_OPTIONS,
  HOOK_MAX_LENGTH,
  type GenerateResult,
} from "@/lib/studio";
import { generateClip } from "@/app/app/proof/[id]/studio/actions";
import { StudioConsentRequired } from "./studio-consent-required";

// The studio's ONLY interactive island (T2.4b — the configure-and-generate surface,
// Principle VIII: NO timeline/track/scrubber). Exposes exactly Format + the editable
// brand hook + Generate (Q3→A / FR-004/005). On Generate it calls the Server Action
// (which re-checks consent — P-VII — and persists), plays the press-run, then reveals
// the result EXPLICITLY labelled a sample/preview (FR-007/Q2). The Generate button is
// disabled while pending so a double-click cannot write two rows (D4).

const ASPECT: Record<ClipFormat, string> = {
  "9x16": "aspect-[9/16]",
  "1x1": "aspect-square",
  "4x5": "aspect-[4/5]",
  "16x9": "aspect-video",
};

const FORMAT_LABEL: Record<ClipFormat, string> = {
  "9x16": "9 : 16",
  "1x1": "1 : 1",
  "4x5": "4 : 5",
  "16x9": "16 : 9",
};

export function ClipStudioForm({ proofId }: { proofId: string }) {
  const [format, setFormat] = useState<ClipFormat>(DEFAULT_FORMAT);
  const [hook, setHook] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  async function onGenerate() {
    if (pending) return; // belt-and-braces; the button is also disabled
    setPending(true);
    setResult(null);
    try {
      const res = await generateClip({ proofId, format, hook });
      setResult(res);
    } catch {
      setResult({ status: "error" });
    } finally {
      setPending(false);
    }
  }

  const showFill = pending || result?.status === "generated";

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* result stage — the press-run fills bottom-up, then the labelled sample */}
      <div>
        <div
          className={`relative mx-auto w-full max-w-72 overflow-hidden rounded-clip border border-hairline bg-sunken shadow-clip ${ASPECT[format]}`}
        >
          {/* the press-run — fills bottom-up like ink (the signature motion;
              ink, NOT persimmon — P-IV); settles instantly under
              prefers-reduced-motion via the global motion rule */}
          <div
            className={`absolute inset-0 origin-bottom bg-ink transition-transform duration-300 ease-pressroom ${
              showFill ? "scale-y-100" : "scale-y-0"
            }`}
            aria-hidden
          />
          <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
            {showFill ? (
              <span
                className="inline-flex items-center rounded-pill bg-paper px-2.5 py-1 font-mono text-mono-sm uppercase tracking-wide text-ink"
                aria-live="polite"
              >
                {result?.status === "generated" ? "Sample preview" : "Generating…"}
              </span>
            ) : (
              <p className="font-ui text-body-sm text-ink-3">
                Generate to preview your clip
              </p>
            )}
          </div>
        </div>

        {/* honest stand-in copy (FR-007/FR-019) — only after a result */}
        {result?.status === "generated" && (
          <div className="mt-4 space-y-2">
            <p className="font-ui text-body-sm text-ink-2">
              This is a <strong className="font-medium text-ink">sample</strong>{" "}
              standing in for the real render — you&rsquo;re previewing the
              experience, not a finished clip of this customer. Your clip,
              rendered from this proof, arrives when the engine ships.
            </p>
            <p className="font-mono text-mono-sm text-ink-3">
              Configured · {FORMAT_LABEL[result.clip.format]}
              {result.clip.hook ? ` · hook: “${result.clip.hook}”` : ""}
            </p>
          </div>
        )}

        {result?.status === "consent_required" && (
          <div className="mt-4">
            <StudioConsentRequired proofId={proofId} />
          </div>
        )}

        {result?.status === "error" && (
          <p className="mt-4 font-ui text-body-sm text-danger" role="alert">
            We couldn&rsquo;t generate that just now. Try again in a moment.
          </p>
        )}
      </div>

      {/* configuration — Format + the editable brand hook + Generate */}
      <div className="flex flex-col gap-6">
        <fieldset>
          <legend className="font-ui text-label uppercase tracking-wide text-ink-3">
            Format
          </legend>
          <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Clip format">
            {FORMAT_OPTIONS.map((opt) => {
              const selected = opt.value === format;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setFormat(opt.value)}
                  className={`rounded-control px-3 py-1.5 font-ui text-body-sm font-medium transition-colors duration-200 ease-pressroom focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                    selected
                      ? "bg-ink text-paper"
                      : "border border-rule text-ink hover:bg-sunken"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="clip-hook"
            className="font-ui text-label uppercase tracking-wide text-ink-3"
          >
            Hook
          </label>
          <p className="font-ui text-body-sm text-ink-3">
            Your marketing line — the brand&rsquo;s words, not the customer&rsquo;s.
          </p>
          <textarea
            id="clip-hook"
            value={hook}
            onChange={(e) => setHook(e.target.value)}
            maxLength={HOOK_MAX_LENGTH}
            rows={3}
            placeholder="e.g. The candle our customers keep coming back for"
            className="rounded-control border border-rule bg-card px-3 py-2 font-ui text-body text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          />
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={pending}
          aria-busy={pending}
          className="inline-flex w-fit items-center justify-center gap-2 rounded-control bg-persimmon px-4 py-2.5 font-ui text-body-sm font-medium text-on-accent transition-colors duration-200 ease-pressroom hover:bg-persimmon-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Scissors className="size-4" strokeWidth={1.5} aria-hidden />
          {pending ? "Generating…" : "Generate"}
        </button>
      </div>
    </div>
  );
}
