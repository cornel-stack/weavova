"use client";

import { ImagePlus } from "lucide-react";
import {
  contrastOn,
  fontClassName,
  isHexColor,
  type BrandKitFonts,
} from "@/lib/brand-kit";

// The honest identity preview (Client, T5-BrandKit). Shows the kit's OWN real elements
// — the logo <img> (or the honest no-logo state), the brand-colour swatch with its
// DERIVED readable contrast (contrastOn — not stored), and font specimens of the
// picked, render-available fonts. Everything here is real and directly displayable.
//
// THE T8 SEAM (FR-006): applying this identity to STYLE a rendered clip is the render
// engine = T8. A clearly-labeled panel says so. There is NO faked styled-clip /
// live-reskin preview (the reference's live-reskin is omitted — FR-011).

export function BrandKitPreview({
  logoUrl,
  brandColor,
  fonts,
}: {
  logoUrl: string | null;
  brandColor: string;
  fonts: BrandKitFonts;
}) {
  const safeColor = isHexColor(brandColor) ? brandColor : "#B5443C";
  const onColor = contrastOn(safeColor);

  return (
    <div className="space-y-5 rounded-clip border border-hairline bg-card p-6 shadow-clip">
      <h2 className="font-ui text-label uppercase tracking-wide text-ink-3">
        Your identity
      </h2>

      {/* logo — real <img> or honest no-logo */}
      <div className="flex items-center gap-4">
        <div className="flex size-16 items-center justify-center overflow-hidden rounded-clip border border-hairline bg-paper">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Brand logo"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <ImagePlus className="size-6 text-ink-3" strokeWidth={1.5} aria-hidden />
          )}
        </div>
        <span className="font-ui text-body-sm text-ink-3">
          {logoUrl ? "Your logo" : "No logo yet — upload one"}
        </span>
      </div>

      {/* brand colour swatch + derived contrast */}
      <div
        className="flex items-center justify-between rounded-clip px-4 py-5"
        style={{ backgroundColor: safeColor, color: onColor }}
      >
        <span className="font-ui text-body font-medium">Brand colour</span>
        <span className="font-mono text-mono-sm">{safeColor.toUpperCase()}</span>
      </div>

      {/* font specimens — real, render-available families */}
      <div className="space-y-2">
        <p className={`${fontClassName(fonts.display)} text-display-sm text-ink`}>
          The customer is the headline
        </p>
        <p className={`${fontClassName(fonts.body)} text-body text-ink-2`}>
          Real proof, reshaped into post-ready content — styled in your brand.
        </p>
      </div>

      {/* the honest T8 seam — no faked styled-clip preview */}
      <div className="rounded-clip border border-hairline bg-sunken px-4 py-3">
        <p className="font-ui text-body-sm text-ink-2">
          This identity will style your rendered clips when rendering ships. We
          don&rsquo;t show a styled clip until it&rsquo;s really rendered.
        </p>
      </div>
    </div>
  );
}
