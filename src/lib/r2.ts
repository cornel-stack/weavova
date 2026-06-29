import { AwsClient } from "aws4fetch";

// ============================================================================
// Cloudflare R2 — the project's FIRST real object-storage wiring (T4-B2).
// SERVER-ONLY by convention (imported only from "use server" actions; mirrors
// src/db/client.ts — no `server-only` package is added). This module is the ONLY
// place R2 config + signing lives. The validation constants (ALLOWED_UPLOAD_TYPES,
// MAX_UPLOAD_BYTES) live in the client-safe src/lib/brand-asset.ts so they can be
// shared with the upload widget without pulling aws4fetch into a client bundle.
//
// It does NOT read env or construct a client at import time — so the app builds
// and typechecks WITHOUT any R2 credentials (CI / static build parity, mirroring
// src/db/client.ts's lazy getDb()). A missing var only throws when a presign is
// actually requested (the live upload walk), never at build.
//
// Transport = PRESIGNED PUT, browser → R2 (ratified): the server signs a
// short-lived PUT URL via aws4fetch; the BROWSER PUTs the file bytes directly to
// R2. Bytes NEVER transit the Next.js server (Vercel request-body / Active-CPU
// limits — these are product videos). `SAMPLE_CLIP_URL` (the stubbed clip seam)
// is unrelated and unchanged; R2 here is for brand-asset objects only.
// ============================================================================

// The signed PUT URL is valid for a short window — long enough to start the
// browser upload, short enough to limit replay.
const PRESIGN_TTL_SECONDS = 300;

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

// Read R2 config lazily from env (CORNEL-OWNED infra — never hardcoded). Throws a
// deterministic, credential-free error if a var is missing, and ONLY when called.
function getConfig(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucket ||
    !publicBaseUrl
  ) {
    throw new Error(
      "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL.",
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

// The R2 S3-compatible endpoint for an object key.
function objectEndpoint(cfg: R2Config, key: string): string {
  return `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}/${key}`;
}

// The stored, publicly-referenceable URL we persist as brand_asset.assetUrl.
export function assetUrlForKey(key: string): string {
  const cfg = getConfig();
  return `${cfg.publicBaseUrl.replace(/\/$/, "")}/${key}`;
}

// A workspace-scoped object key for a brand-asset upload. The random suffix is
// caller-supplied (server-generated) so this module needs no Math.random/Date.
export function brandAssetKey(workspaceId: string, suffix: string): string {
  return `brand-assets/${workspaceId}/${suffix}`;
}

// A workspace-scoped object key for a brand-kit LOGO upload (T5-BrandKit). Reuses the
// same R2 bucket + the presignPut/assetUrlForKey path; only the key prefix differs
// (brand-kit/). The random suffix is caller-supplied (server-generated).
export function brandKitLogoKey(workspaceId: string, suffix: string): string {
  return `brand-kit/${workspaceId}/${suffix}`;
}

// A workspace-scoped object key for a capture-page media upload (T7.2). Same R2
// bucket + presignPut/assetUrlForKey path; only the prefix differs (capture/). The
// random suffix is caller-supplied (server-generated). Used by the video/audio/photo
// paths whose bytes PUT directly to R2 (never through the app server).
export function captureMediaKey(workspaceId: string, suffix: string): string {
  return `capture/${workspaceId}/${suffix}`;
}

// Sign a short-lived PUT URL for `key` bound to `contentType` (aws4fetch SigV4).
// The browser will PUT the file to this URL directly. Returns the URL only; the
// row is recorded separately AFTER the browser confirms the PUT succeeded.
export async function presignPut(
  key: string,
  contentType: string,
): Promise<string> {
  const cfg = getConfig();
  const client = new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto", // R2 uses the "auto" region
  });
  const url = new URL(objectEndpoint(cfg, key));
  url.searchParams.set("X-Amz-Expires", String(PRESIGN_TTL_SECONDS));
  const signed = await client.sign(
    new Request(url, { method: "PUT", headers: { "content-type": contentType } }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}
