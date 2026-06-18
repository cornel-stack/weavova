"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createBrandAsset } from "@/db/queries";
import {
  isAllowedUploadType,
  isBrandAssetKind,
  LABEL_MAX_LENGTH,
  MAX_UPLOAD_BYTES,
  type BrandAssetKind,
  type CreateBrandAssetResult,
  type PresignResult,
} from "@/lib/brand-asset";
import { assetUrlForKey, brandAssetKey, presignPut } from "@/lib/r2";
import { getCurrentWorkspace } from "@/lib/session";

// The footage-store Server Actions (T4-B2). The ratified presigned-PUT flow:
//   1) presignBrandAssetUpload — server VALIDATES + signs a short-lived R2 PUT URL.
//   2) the BROWSER PUTs the file bytes directly to R2 (never through this server).
//   3) createBrandAssetRecord — on the browser's success, server re-validates +
//      persists the brand_asset row (assetUrl).
// Brand assets are OWNED footage: NO consent flow is ever invoked here (P-VII).
// Identity is resolved server-side via getCurrentWorkspace() — never the client.

const EXT_BY_TYPE: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

// Validate the owned metadata + media descriptor (never trust the client).
function validateMeta(raw: {
  kind: unknown;
  label: unknown;
}): { kind: BrandAssetKind; label: string } | { reason: string } {
  if (!isBrandAssetKind(raw.kind)) return { reason: "Pick a footage type." };
  if (typeof raw.label !== "string") return { reason: "Add a label." };
  const label = raw.label.trim();
  if (label.length === 0) return { reason: "Add a label." };
  if (label.length > LABEL_MAX_LENGTH)
    return { reason: `Keep the label under ${LABEL_MAX_LENGTH} characters.` };
  return { kind: raw.kind, label };
}

export async function presignBrandAssetUpload(input: {
  kind: BrandAssetKind;
  label: string;
  contentType: string;
  sizeBytes: number;
}): Promise<PresignResult> {
  const meta = validateMeta(input);
  if ("reason" in meta) return { status: "invalid", reason: meta.reason };

  if (!isAllowedUploadType(input.contentType)) {
    return { status: "invalid", reason: "That file type isn't supported." };
  }
  if (
    typeof input.sizeBytes !== "number" ||
    !Number.isFinite(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > MAX_UPLOAD_BYTES
  ) {
    return { status: "invalid", reason: "That file is too large." };
  }

  const workspace = await getCurrentWorkspace();
  const ext = EXT_BY_TYPE[input.contentType] ?? "bin";
  const key = brandAssetKey(workspace.id, `${randomUUID()}.${ext}`);

  try {
    const uploadUrl = await presignPut(key, input.contentType);
    return { status: "ok", uploadUrl, key };
  } catch {
    return { status: "error" };
  }
}

export async function createBrandAssetRecord(input: {
  kind: BrandAssetKind;
  label: string;
  key: string;
}): Promise<CreateBrandAssetResult> {
  const meta = validateMeta(input);
  if ("reason" in meta) return { status: "invalid", reason: meta.reason };
  if (typeof input.key !== "string" || input.key.length === 0) {
    return { status: "invalid", reason: "Upload didn't complete." };
  }

  const workspace = await getCurrentWorkspace();
  try {
    const asset = await createBrandAsset({
      workspaceId: workspace.id,
      kind: meta.kind,
      label: meta.label,
      assetUrl: assetUrlForKey(input.key),
    });
    revalidatePath("/app/footage");
    return { status: "created", asset };
  } catch {
    return { status: "error" };
  }
}
