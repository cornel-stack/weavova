import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  FileText,
  Scissors,
  Store,
} from "lucide-react";
import Link from "next/link";
import type { ClipDetailView, ClipFormat } from "@/lib/clip";
import type { ConsentState, ProofType } from "@/lib/proof";
import { FORMAT_OPTIONS } from "@/lib/studio";

// The clip detail (Server, T3.2). NO design-reference screen exists for this — it is
// a DERIVED surface built from the proof-detail (03) two-column layout + the studio
// (04) clip/sample framing. The source customer leads (the headline — P-II); the clip
// is an honest NON-PLAYING "Sample preview" still in the chosen format (no <video>;
// the T8 playback seam — FR-019). Owned data only; the source-proof link + re-make
// (→ the consent-gated studio) are the ONLY actions (A-11). Two consent roles shown:
// the made-under provenance and the current effective gate.

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

const FORMAT_LABEL: Record<ClipFormat, string> = Object.fromEntries(
  FORMAT_OPTIONS.map((o) => [o.value, o.label]),
) as Record<ClipFormat, string>;

const ASPECT: Record<ClipFormat, string> = {
  "9x16": "aspect-[9/16]",
  "1x1": "aspect-square",
  "4x5": "aspect-[4/5]",
  "16x9": "aspect-video",
};

const TYPE_LABEL: Record<ProofType, string> = {
  text: "Text",
  video: "Video",
  photo: "Photo",
  audio: "Audio",
};

const CONSENT_DOT: Record<ConsentState, string> = {
  granted: "bg-success",
  awaiting: "bg-warning",
  revoked: "bg-danger",
};

const CONSENT_LABEL: Record<ConsentState, string> = {
  granted: "Consent granted",
  awaiting: "Awaiting consent",
  revoked: "Consent revoked",
};

export function ClipDetail({ clip }: { clip: ClipDetailView }) {
  const currentConsentMeta = [
    clip.consentAt ? formatDate(clip.consentAt) : null,
    clip.consentVersion != null ? `v${clip.consentVersion}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const madeUnder = [
    `v${clip.madeUnderVersion}`,
    clip.madeUnderAt ? formatDate(clip.madeUnderAt) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      {/* back to the Library */}
      <Link
        href="/app/library"
        className="inline-flex items-center gap-1.5 font-ui text-body-sm text-ink-2 transition-colors duration-200 ease-pressroom hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <ArrowLeft className="size-4" strokeWidth={1.5} aria-hidden />
        Library
      </Link>

      {/* the source customer leads (the headline — P-II) */}
      <div className="mt-3 flex items-center gap-2">
        <h1 className="font-display text-display-md text-ink">
          {clip.customerName}
        </h1>
        {clip.verified && (
          <span
            className="flex items-center text-persimmon"
            title="Verified real customer"
          >
            <BadgeCheck className="size-5" strokeWidth={1.5} aria-hidden />
            <span className="sr-only">Verified real customer</span>
          </span>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* content — the clip as a non-playing sample/preview still + the hook */}
        <div className="space-y-6 lg:col-span-2">
          <div
            className={`relative mx-auto flex w-full max-w-sm items-center justify-center overflow-hidden rounded-clip border border-hairline bg-sunken shadow-clip ${ASPECT[clip.format]}`}
          >
            <span className="rounded-pill bg-card/90 px-3 py-1 font-mono text-mono-sm uppercase tracking-wide text-ink-2">
              Sample preview
            </span>
            <span className="absolute bottom-2 right-2 rounded-pill bg-card/90 px-2 py-0.5 font-mono text-mono-sm text-ink-2">
              {FORMAT_LABEL[clip.format]}
            </span>
          </div>
          <p className="mx-auto max-w-sm text-center font-ui text-body-sm text-ink-3">
            A sample standing in for the real render — the engine that renders this
            proof arrives later. This is not a finished clip of the customer.
          </p>

          {clip.hook && (
            <div className="rounded-clip border border-hairline bg-card p-5 shadow-clip">
              <h2 className="font-ui text-label uppercase tracking-wide text-ink-3">
                Hook
              </h2>
              <p className="mt-2 font-display text-display-xs text-ink">
                {clip.hook}
              </p>
              <p className="mt-1 font-ui text-body-sm text-ink-3">
                The brand&rsquo;s line — not the customer&rsquo;s words.
              </p>
            </div>
          )}
        </div>

        {/* side panel — provenance + the two actions */}
        <aside className="flex flex-col gap-6">
          {/* provenance / metadata */}
          <div className="rounded-clip border border-hairline bg-card p-5 shadow-clip">
            <h2 className="font-ui text-label uppercase tracking-wide text-ink-3">
              Clip
            </h2>
            <dl className="mt-3 space-y-2.5 font-ui text-body-sm text-ink-2">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-ink-3" strokeWidth={1.5} aria-hidden />
                <dt className="sr-only">Format</dt>
                <dd>{FORMAT_LABEL[clip.format]} clip</dd>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-ink-3" strokeWidth={1.5} aria-hidden />
                <dt className="sr-only">Created</dt>
                <dd>Created {formatDate(clip.createdAt)}</dd>
              </div>
              <div className="flex items-center gap-2">
                <Store className="size-4 text-ink-3" strokeWidth={1.5} aria-hidden />
                <dt className="sr-only">Source</dt>
                <dd>
                  {TYPE_LABEL[clip.proofType]} proof · {clip.source}
                </dd>
              </div>
            </dl>
            {/* the source-proof link lives INSIDE the detail (provenance) */}
            <Link
              href={`/app/proof/${clip.proofId}`}
              className="mt-4 inline-flex items-center gap-1.5 font-ui text-body-sm font-medium text-ink transition-colors duration-200 ease-pressroom hover:text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              View source proof
              <ArrowLeft className="size-4 rotate-180" strokeWidth={1.5} aria-hidden />
            </Link>
          </div>

          {/* consent — made-under provenance + current effective gate */}
          <div className="rounded-clip border border-hairline bg-card p-5 shadow-clip">
            <h2 className="font-ui text-label uppercase tracking-wide text-ink-3">
              Consent
            </h2>
            <div className="mt-3 flex items-center gap-2 font-ui text-body-sm text-ink">
              <span
                className={`size-2 rounded-pill ${CONSENT_DOT[clip.consentState]}`}
                aria-hidden
              />
              <span className="font-medium">{CONSENT_LABEL[clip.consentState]}</span>
            </div>
            {currentConsentMeta && (
              <p className="mt-2 font-mono text-mono-sm text-ink-3">
                {currentConsentMeta}
              </p>
            )}
            <p className="mt-3 font-ui text-body-sm text-ink-2">
              Made under consent {madeUnder}
            </p>
          </div>

          {/* the only generating path — re-make in the consent-gated studio */}
          <Link
            href={`/app/proof/${clip.proofId}/studio`}
            className="inline-flex items-center justify-center gap-2 rounded-control bg-persimmon px-4 py-2.5 font-ui text-body-sm font-medium text-on-accent transition-colors duration-200 ease-pressroom hover:bg-persimmon-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <Scissors className="size-4" strokeWidth={1.5} aria-hidden />
            Re-make in studio
          </Link>
        </aside>
      </div>
    </div>
  );
}
