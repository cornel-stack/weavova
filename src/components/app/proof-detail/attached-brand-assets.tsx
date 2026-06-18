"use client";

import { useMemo, useState } from "react";
import { Clapperboard, Plus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BRAND_ASSET_KIND_LABEL,
  type BrandAssetView,
  type ProofBrandAssetView,
} from "@/lib/brand-asset";
import {
  attachBrandAssetToProof,
  detachBrandAssetFromProof,
} from "@/app/app/proof/[id]/actions";

// The proof detail's "Attached brand assets" section (Client, T4-B2 — additive).
// Brand footage is SUPPORTING CONTEXT, never the headline: this section sits below
// the customer's words (P-II). HONEST RENDERING (A-11): attached assets are METADATA
// rows (kind chip + label) — never <video>/thumbnails. The T8-composite seam is an
// HONEST deferred label ("will appear in the rendered clip when rendering ships") —
// NO fake combined preview, no claim the asset is already in any output (FR-019).
// Attaching/detaching owned footage NEVER touches consent (P-VII). NO delete-from-
// store here — that's a conscious deferral (Q2:A); this only attaches/detaches.

export function AttachedBrandAssets({
  proofId,
  attached,
  storeAssets,
}: {
  proofId: string;
  attached: ProofBrandAssetView[];
  storeAssets: BrandAssetView[];
}) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const attachedIds = useMemo(
    () => new Set(attached.map((a) => a.id)),
    [attached],
  );
  const available = useMemo(
    () => storeAssets.filter((a) => !attachedIds.has(a.id)),
    [storeAssets, attachedIds],
  );

  async function onAttach(brandAssetId: string) {
    if (pendingId) return;
    setPendingId(brandAssetId);
    setError(null);
    try {
      const res = await attachBrandAssetToProof({ proofId, brandAssetId });
      if (res.status === "error") {
        setError("Couldn't attach that just now. Try again.");
      } else {
        setPicking(false);
        router.refresh();
      }
    } catch {
      setError("Couldn't attach that just now. Try again.");
    } finally {
      setPendingId(null);
    }
  }

  async function onDetach(brandAssetId: string) {
    if (pendingId) return;
    setPendingId(brandAssetId);
    setError(null);
    try {
      const res = await detachBrandAssetFromProof({ proofId, brandAssetId });
      if (res.status === "error") {
        setError("Couldn't remove that just now. Try again.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Couldn't remove that just now. Try again.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-ui text-label uppercase tracking-wide text-ink-3">
          Attached brand assets
        </h2>
        <button
          type="button"
          onClick={() => {
            setPicking((v) => !v);
            setError(null);
          }}
          aria-expanded={picking}
          className="inline-flex items-center gap-1.5 rounded-control border border-rule bg-card px-3 py-1.5 font-ui text-body-sm font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <Plus className="size-4" strokeWidth={1.5} aria-hidden />
          Attach
        </button>
      </div>

      {/* Honest framing — owned footage as supporting context, woven in at T8. */}
      <p className="mt-2 font-ui text-body-sm text-ink-2">
        Your own footage, woven in as supporting context. It will appear in the
        rendered clip when rendering ships — the customer&rsquo;s proof stays the
        headline.
      </p>

      {/* The attach picker — pick from the reusable store (owned footage). */}
      {picking && (
        <div className="mt-3 rounded-clip border border-hairline bg-card p-4 shadow-clip">
          {available.length === 0 ? (
            <p className="font-ui text-body-sm text-ink-2">
              {storeAssets.length === 0
                ? "No brand footage yet. "
                : "Everything in your library is already attached. "}
              <Link
                href="/app/footage"
                className="font-medium text-ink underline decoration-rule underline-offset-2 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Manage or upload footage
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-2">
              {available.map((asset) => (
                <li
                  key={asset.id}
                  className="flex items-center gap-3 rounded-control border border-hairline bg-paper p-3"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-sunken text-ink-2">
                    <Clapperboard
                      className="size-4"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-ui text-body-sm font-medium text-ink">
                      {asset.label}
                    </p>
                    <p className="font-mono text-mono-sm text-ink-3">
                      {BRAND_ASSET_KIND_LABEL[asset.kind]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAttach(asset.id)}
                    disabled={pendingId !== null}
                    aria-busy={pendingId === asset.id}
                    className="shrink-0 rounded-control bg-ink px-3 py-1.5 font-ui text-body-sm font-medium text-paper transition-colors duration-200 ease-pressroom hover:bg-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pendingId === asset.id ? "Attaching…" : "Attach"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {storeAssets.length > 0 && available.length > 0 && (
            <p className="mt-3 font-ui text-body-sm text-ink-3">
              <Link
                href="/app/footage"
                className="underline decoration-rule underline-offset-2 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Manage or upload footage
              </Link>
            </p>
          )}
        </div>
      )}

      {/* The attached list — honest metadata rows, each detachable. */}
      {attached.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {attached.map((asset) => (
            <li
              key={asset.attachmentId}
              className="flex items-center gap-3 rounded-clip border border-hairline bg-card p-4 shadow-clip"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-sunken text-ink-2">
                <Clapperboard className="size-5" strokeWidth={1.5} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-ui text-body-sm font-medium text-ink">
                  {asset.label}
                </p>
                <p className="font-mono text-mono-sm text-ink-3">
                  {BRAND_ASSET_KIND_LABEL[asset.kind]} · in the rendered clip at T8
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDetach(asset.id)}
                disabled={pendingId !== null}
                aria-busy={pendingId === asset.id}
                aria-label={`Remove ${asset.label}`}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-control border border-rule bg-card px-2.5 py-1.5 font-ui text-body-sm text-ink-2 transition-colors duration-200 ease-pressroom hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X className="size-4" strokeWidth={1.5} aria-hidden />
                {pendingId === asset.id ? "Removing…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !picking && (
          <p className="mt-3 font-ui text-body-sm text-ink-3">
            No brand footage attached yet.
          </p>
        )
      )}

      {error && (
        <p className="mt-3 font-ui text-body-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
