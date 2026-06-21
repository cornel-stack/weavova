"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { saveBrandKit } from "@/app/app/brand/actions";
import {
  FONT_OPTIONS,
  isHexColor,
  type BrandKitFonts,
  type FontKey,
} from "@/lib/brand-kit";
import { BrandKitLogoUpload } from "./brand-kit-logo-upload";
import { BrandKitPreview } from "./brand-kit-preview";

// The brand-kit editor (Client, T5-BrandKit) — the PARTIAL honest port of screen 12:
// logo + brand colour + curated fonts + Save, with a live identity preview. The
// reference's "live preview · reskins live", B-roll cutaways, default music bed,
// per-format caption styles, multi-kit list, and light/dark logos are OMITTED entirely
// (not faked, not dead-stubbed — FR-011); applying the identity to a rendered clip is
// the labeled T8 seam shown in the preview. Every control genuinely persists (A-11):
// Save calls the saveBrandKit upsert. Owned brand data — no consent.

type Initial = {
  name: string | null;
  logoAssetUrl: string | null;
  brandColor: string;
  fonts: BrandKitFonts;
};

export function BrandKitEditor({ initial }: { initial: Initial }) {
  const [brandColor, setBrandColor] = useState(initial.brandColor);
  const [fonts, setFonts] = useState<BrandKitFonts>(initial.fonts);
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoAssetUrl);
  // a freshly-uploaded object key to persist on Save (null = keep existing logo)
  const [logoKey, setLogoKey] = useState<string | null>(null);

  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onUploaded(key: string, previewUrl: string) {
    setLogoKey(key);
    setLogoUrl(previewUrl);
    setSaved(false);
  }

  function setFont(role: keyof BrandKitFonts, value: FontKey) {
    setFonts((prev) => ({ ...prev, [role]: value }));
    setSaved(false);
  }

  async function onSave() {
    if (pending) return;
    setError(null);
    if (!isHexColor(brandColor)) {
      setError("Pick a valid brand colour.");
      return;
    }
    setPending(true);
    setSaved(false);
    try {
      const res = await saveBrandKit({
        name: initial.name,
        brandColor,
        fonts,
        logoKey,
      });
      if (res.status === "saved") {
        setSaved(true);
        setLogoKey(null); // persisted — no longer pending
        setLogoUrl(res.kit.logoAssetUrl ?? logoUrl);
      } else if (res.status === "invalid") {
        setError(res.reason);
      } else {
        setError("Couldn’t save — try again.");
      }
    } catch {
      setError("Couldn’t save — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-display-lg text-ink">Brand kit</h1>
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          aria-busy={pending}
          className="inline-flex items-center gap-2 rounded-control bg-persimmon px-4 py-2 font-ui text-body-sm font-medium text-on-accent transition-colors duration-200 ease-pressroom hover:bg-persimmon-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saved ? (
            <Check className="size-4" strokeWidth={1.5} aria-hidden />
          ) : null}
          {pending ? "Saving…" : saved ? "Saved" : "Save kit"}
        </button>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* the editor form */}
        <div className="space-y-6">
          <BrandKitLogoUpload
            initialLogoUrl={initial.logoAssetUrl}
            onUploaded={onUploaded}
          />

          {/* brand colour — one hex; auto-contrast is derived in the preview */}
          <div className="flex flex-col gap-2">
            <span className="font-ui text-label uppercase tracking-wide text-ink-3">
              Brand colour
            </span>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={isHexColor(brandColor) ? toSixHex(brandColor) : "#B5443C"}
                onChange={(e) => {
                  setBrandColor(e.target.value);
                  setSaved(false);
                }}
                aria-label="Brand colour"
                className="size-10 cursor-pointer rounded-control border border-hairline bg-card"
              />
              <input
                type="text"
                value={brandColor}
                onChange={(e) => {
                  setBrandColor(e.target.value);
                  setSaved(false);
                }}
                aria-label="Brand colour hex"
                className="w-32 rounded-control border border-hairline bg-card px-3 py-2 font-mono text-mono-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              />
            </div>
          </div>

          {/* curated fonts — display + body (no upload) */}
          <div className="flex flex-col gap-3">
            <span className="font-ui text-label uppercase tracking-wide text-ink-3">
              Fonts
            </span>
            <FontPicker
              label="Display"
              value={fonts.display}
              onChange={(v) => setFont("display", v)}
            />
            <FontPicker
              label="Body"
              value={fonts.body}
              onChange={(v) => setFont("body", v)}
            />
          </div>

          {error && (
            <p
              className="font-ui text-body-sm text-danger"
              role="status"
              aria-live="polite"
            >
              {error}
            </p>
          )}
        </div>

        {/* the honest identity preview */}
        <BrandKitPreview
          logoUrl={logoUrl}
          brandColor={brandColor}
          fonts={fonts}
        />
      </div>
    </div>
  );
}

function FontPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: FontKey;
  onChange: (value: FontKey) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-control border border-hairline bg-card px-3 py-1.5 font-ui text-body-sm text-ink-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
      <span className="text-ink-3">{label} ·</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FontKey)}
        className="bg-card font-ui text-body-sm font-medium text-ink focus:outline-none"
      >
        {FONT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// Normalise a #RGB shorthand to #RRGGBB for the native colour input.
function toSixHex(hex: string): string {
  if (hex.length === 4) {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return hex;
}
