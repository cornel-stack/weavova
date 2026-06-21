"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getBrandKit, upsertBrandKit } from "@/db/queries";
import {
  isAllowedLogoType,
  isHexColor,
  isValidFontKey,
  KIT_NAME_MAX_LENGTH,
  MAX_LOGO_BYTES,
  type BrandKitFonts,
  type LogoPresignResult,
  type SaveBrandKitResult,
} from "@/lib/brand-kit";
import { assetUrlForKey, brandKitLogoKey, presignPut } from "@/lib/r2";
import { getCurrentWorkspace } from "@/lib/session";

// Brand-kit Server Actions (T5-BrandKit). The logo upload REUSES B2's ratified
// presigned-PUT flow verbatim (presignPut → browser PUTs direct to R2 →
// assetUrlForKey on save). NO new dependency. The kit is OWNED brand data — NO
// consent flow is ever invoked here (P-VII / FR-019). Identity is resolved
// server-side via getCurrentWorkspace() — never trusted from the client.

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

// Step 1 — validate the IMAGE + sign a short-lived R2 PUT URL (mirrors B2). The
// browser then PUTs the bytes directly to R2; the row is persisted on Save.
export async function presignBrandKitLogoUpload(input: {
  contentType: string;
  sizeBytes: number;
}): Promise<LogoPresignResult> {
  if (!isAllowedLogoType(input.contentType)) {
    return { status: "invalid", reason: "Use a PNG, JPEG, SVG, or WebP image." };
  }
  if (
    typeof input.sizeBytes !== "number" ||
    !Number.isFinite(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > MAX_LOGO_BYTES
  ) {
    return { status: "invalid", reason: "That image is too large (max 5 MB)." };
  }

  const workspace = await getCurrentWorkspace();
  const ext = EXT_BY_TYPE[input.contentType] ?? "bin";
  const key = brandKitLogoKey(workspace.id, `${randomUUID()}.${ext}`);

  try {
    const uploadUrl = await presignPut(key, input.contentType);
    return { status: "ok", uploadUrl, key };
  } catch {
    return { status: "error" };
  }
}

// Validate the curated fonts pick server-side (never trust the client).
function validateFonts(raw: unknown): BrandKitFonts | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { display, body } = raw as Record<string, unknown>;
  if (!isValidFontKey(display) || !isValidFontKey(body)) return null;
  return { display, body };
}

// Step 2 — persist the whole kit (UPSERT). `logoKey` is a freshly-uploaded object's
// key (from step 1); when provided we persist assetUrlForKey(key), otherwise we keep
// the existing kit's logo (so saving colours/fonts never clobbers an existing logo).
export async function saveBrandKit(input: {
  name: string | null;
  brandColor: string;
  fonts: BrandKitFonts;
  logoKey: string | null;
}): Promise<SaveBrandKitResult> {
  if (!isHexColor(input.brandColor)) {
    return { status: "invalid", reason: "Pick a valid brand colour." };
  }
  const fonts = validateFonts(input.fonts);
  if (!fonts) return { status: "invalid", reason: "Pick your fonts." };

  const name =
    typeof input.name === "string" && input.name.trim().length > 0
      ? input.name.trim()
      : null;
  if (name && name.length > KIT_NAME_MAX_LENGTH) {
    return { status: "invalid", reason: "Keep the kit name shorter." };
  }

  try {
    const workspace = await getCurrentWorkspace();

    // Resolve the logo: a fresh upload key → its public URL; else keep the existing.
    let logoAssetUrl: string | null;
    if (typeof input.logoKey === "string" && input.logoKey.length > 0) {
      logoAssetUrl = assetUrlForKey(input.logoKey);
    } else {
      const current = await getBrandKit(workspace.id);
      logoAssetUrl = current?.logoAssetUrl ?? null;
    }

    const kit = await upsertBrandKit(workspace.id, {
      name,
      logoAssetUrl,
      brandColor: input.brandColor,
      fonts,
    });

    revalidatePath("/app/brand");
    return { status: "saved", kit };
  } catch {
    return { status: "error" };
  }
}
