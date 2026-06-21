// Brand kit — the workspace's owned visual identity (T5-BrandKit): logo, one brand
// colour, and a curated font pair, stored once and reusable. OWNED brand data, like
// B2's footage — NO consent involvement (FR-019). CLIENT-SAFE: no DB code; the
// validation constants live here (mirroring src/lib/brand-asset.ts) so the upload
// widget can validate without pulling aws4fetch into a client bundle.
//
// HONESTY: the identity stored + previewed here is real and buildable now. APPLYING
// the identity to STYLE a rendered clip is the render engine = T8 (the labeled seam).
// We never fake a styled-clip preview. Auto-contrast is DERIVED (contrastOn), not
// stored. Fonts are a CURATED pick of render-available families — no font upload.

// ── Curated fonts (Q2:A — no upload) ────────────────────────────────────────
// The render-available Pressroom families, already loaded via next/font (their
// Tailwind utilities are font-display / font-ui / font-mono). The kit picks among
// these; specimens render the real loaded fonts.
export type FontKey = "fraunces" | "hanken" | "jetbrains";

export const FONT_OPTIONS: {
  value: FontKey;
  label: string;
  /** the Tailwind font utility that renders this family (real, loaded) */
  className: string;
}[] = [
  { value: "fraunces", label: "Fraunces", className: "font-display" },
  { value: "hanken", label: "Hanken Grotesk", className: "font-ui" },
  { value: "jetbrains", label: "JetBrains Mono", className: "font-mono" },
];

const FONT_KEYS = FONT_OPTIONS.map((o) => o.value);

export function isValidFontKey(value: unknown): value is FontKey {
  return typeof value === "string" && (FONT_KEYS as string[]).includes(value);
}

export function fontClassName(key: FontKey): string {
  return FONT_OPTIONS.find((o) => o.value === key)?.className ?? "font-ui";
}

export interface BrandKitFonts {
  display: FontKey;
  body: FontKey;
}

export const DEFAULT_FONTS: BrandKitFonts = {
  display: "fraunces",
  body: "hanken",
};

// ── The owned kit view ──────────────────────────────────────────────────────
// NO contrast field — it is DERIVED via contrastOn(brandColor) at render time.
export interface BrandKitView {
  id: string;
  name: string | null;
  /** R2 public URL; null → the honest "no logo yet" state (never a broken <img>) */
  logoAssetUrl: string | null;
  /** one brand colour, hex */
  brandColor: string;
  fonts: BrandKitFonts;
}

// ── Colour (one stored, contrast derived) ───────────────────────────────────
export const DEFAULT_BRAND_COLOR = "#B5443C"; // the Pressroom persimmon as an on-token start

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

// Auto-contrast — DERIVED, not stored. Relative luminance of the brand colour →
// a readable on-colour (ink on light brand colours, white on dark). Pure.
export function contrastOn(hex: string): string {
  const INK = "#1C1714";
  const WHITE = "#FFFFFF";
  if (!isHexColor(hex)) return INK;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  // perceived luminance (sRGB-weighted)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.55 ? INK : WHITE;
}

// ── Logo image validation (mirrors B2's brand-asset.ts pattern) ─────────────
export const ALLOWED_LOGO_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
] as const;
export type AllowedLogoType = (typeof ALLOWED_LOGO_TYPES)[number];

export function isAllowedLogoType(value: unknown): value is AllowedLogoType {
  return (
    typeof value === "string" &&
    (ALLOWED_LOGO_TYPES as readonly string[]).includes(value)
  );
}

export const MAX_LOGO_BYTES = 5 * 1024 * 1024; // ~5 MB — logos are small
export const KIT_NAME_MAX_LENGTH = 80;

// ── Action result types ─────────────────────────────────────────────────────
export type LogoPresignResult =
  | { status: "ok"; uploadUrl: string; key: string }
  | { status: "invalid"; reason: string }
  | { status: "error" };

export type SaveBrandKitResult =
  | { status: "saved"; kit: BrandKitView }
  | { status: "invalid"; reason: string }
  | { status: "error" };
