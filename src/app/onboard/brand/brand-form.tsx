"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandKitLogoUpload } from "@/components/app/brand/brand-kit-logo-upload";
import { OnboardFooter, onboardPrimaryClass } from "@/components/app/onboarding/onboard-footer";
import { saveBrandKit } from "@/app/app/brand/actions";
import {
  contrastOn,
  DEFAULT_BRAND_COLOR,
  isHexColor,
  type BrandKitFonts,
  type FontKey,
} from "@/lib/brand-kit";

// T6.2 · Step 3 (design: 3 _ Brand quickstart  _onboard_brand). One logo (optional, PUBLIC
// brand bucket) + one colour + one caption font, with a LIVE preview from the entered values.
// REUSES the existing brand actions (presignBrandKitLogoUpload via BrandKitLogoUpload, then
// saveBrandKit) — no new brand model. The preview is a STYLE demo of the merchant's own brand,
// not a fabricated customer testimonial (P-XIV).

type Caption = "grotesk" | "serif";

// The quickstart offers one caption-font toggle; the full editor (T5) refines display/body.
function fontsFor(caption: Caption): BrandKitFonts {
  const key: FontKey = caption === "serif" ? "fraunces" : "hanken";
  return { display: key, body: key };
}
function captionClass(caption: Caption): string {
  return caption === "serif" ? "font-display" : "font-ui";
}

export function BrandForm({
  initialLogoUrl,
  initialColor,
  initialCaption,
}: {
  initialLogoUrl: string | null;
  initialColor: string;
  initialCaption: Caption;
}) {
  const router = useRouter();
  const [logoKey, setLogoKey] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialLogoUrl);
  const [color, setColor] = useState(initialColor);
  const [caption, setCaption] = useState<Caption>(initialCaption);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeColor = isHexColor(color) ? color : DEFAULT_BRAND_COLOR;

  async function onContinue() {
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const res = await saveBrandKit({
        name: null,
        brandColor: safeColor,
        fonts: fontsFor(caption),
        logoKey,
      });
      if (res.status === "saved") {
        router.push("/onboard/format");
        return;
      }
      setError(
        res.status === "invalid" ? res.reason : "Couldn’t save — try again.",
      );
    } catch {
      setError("Couldn’t save — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_16rem]">
        {/* Controls */}
        <div className="flex flex-col gap-6">
          <BrandKitLogoUpload
            initialLogoUrl={initialLogoUrl}
            onUploaded={(key, previewUrl) => {
              setLogoKey(key);
              setLogoPreview(previewUrl);
            }}
          />

          <div className="flex flex-col gap-2">
            <label
              htmlFor="brandColor"
              className="font-ui text-label uppercase tracking-wide text-ink-3"
            >
              Brand colour
            </label>
            <div className="flex items-center gap-3">
              <input
                id="brandColor"
                type="color"
                value={safeColor}
                onChange={(e) => setColor(e.target.value)}
                className="size-10 cursor-pointer rounded-control border border-hairline bg-card"
              />
              <span className="font-mono text-mono text-ink-2">{safeColor}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-ui text-label uppercase tracking-wide text-ink-3">
              Caption font
            </span>
            <div className="inline-flex w-fit rounded-control border border-hairline bg-card p-1">
              {(["grotesk", "serif"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCaption(c)}
                  className={[
                    "rounded-[6px] px-4 py-1.5 font-ui text-body-sm transition-colors duration-200 ease-pressroom",
                    caption === c ? "bg-ink text-paper" : "text-ink-2 hover:text-ink",
                  ].join(" ")}
                >
                  {c === "grotesk" ? "Grotesk" : "Serif"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live preview — a STYLE demo of the merchant's own brand (not a real testimonial). */}
        <div className="flex flex-col gap-2">
          <span className="font-ui text-label uppercase tracking-wide text-ink-3">
            Live preview
          </span>
          <div className="overflow-hidden rounded-clip border border-hairline bg-card shadow-clip">
            <div className="h-2 w-full" style={{ backgroundColor: safeColor }} aria-hidden />
            <div className="flex flex-col gap-3 p-5">
              <div
                className="flex size-10 items-center justify-center overflow-hidden rounded-pill"
                style={{ backgroundColor: safeColor, color: contrastOn(safeColor) }}
              >
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="font-ui text-body-sm font-medium">Aa</span>
                )}
              </div>
              <p className={`${captionClass(caption)} text-heading-md text-ink`}>
                Your customers’ words will wear this.
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 font-ui text-body-sm text-danger" role="status" aria-live="polite">
          {error}
        </p>
      )}

      <OnboardFooter
        step={3}
        backHref="/onboard/source"
        primary={
          <button
            type="button"
            onClick={onContinue}
            disabled={pending}
            aria-busy={pending}
            className={onboardPrimaryClass}
          >
            {pending ? "Saving…" : "Continue"}
          </button>
        }
      />
    </div>
  );
}
