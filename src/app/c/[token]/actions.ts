"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  consumeCaptureToken,
  getOpenCaptureContext,
  getWorkspaceDisplayDefault,
  writeCapturedProof,
} from "@/db/queries";
import { resolveDisplay, type NameDisplay } from "@/lib/consent";
import {
  CAPTURE_ALLOWED_AUDIO_TYPES,
  CAPTURE_ALLOWED_IMAGE_TYPES,
  CAPTURE_ALLOWED_VIDEO_TYPES,
  CAPTURE_MAX_BYTES,
  type CaptureMediaType,
} from "@/lib/capture";
// presignCaptureUploadToR2: the PRIVATE captures-bucket signed PUT (T7.4a). Aliased because
// the public server action below is also named presignCaptureUpload (the /c page calls it —
// that name is part of the page contract, unchanged). Customer media now stores the KEY, not
// a public URL, so assetUrlForKey/presignPut (the PUBLIC brand path) are no longer used here.
import {
  captureMediaKey,
  presignCaptureUpload as presignCaptureUploadToR2,
} from "@/lib/r2";

// The capture Server Actions (T7.2). TOKEN-SCOPED: identity is resolved from the token,
// never a session (no getCurrentWorkspace on this public route). Increment 1 wired TEXT;
// Increment 2 adds VIDEO (record on-device → presigned-PUT direct to R2 → the SAME atomic
// send). The consume guard + db.batch send core are UNCHANGED (media-agnostic).

// T7.2b — the ext map spans video + image + audio (all store a KEY in the private captures
// bucket). HEIC keeps its extension; the worker re-encodes photos to JPEG on normalize.
const EXT_BY_TYPE: Record<CaptureMediaType, string> = {
  "video/webm": "webm",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "audio/webm": "weba",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
};

// Accept any allowed capture media type (video ∪ image ∪ audio). Widened from the
// video-only gate for T7.2b; storage/routing (private bucket, KEY) is unchanged.
function isAllowedCaptureType(t: string): t is CaptureMediaType {
  return (
    (CAPTURE_ALLOWED_VIDEO_TYPES as readonly string[]).includes(t) ||
    (CAPTURE_ALLOWED_IMAGE_TYPES as readonly string[]).includes(t) ||
    (CAPTURE_ALLOWED_AUDIO_TYPES as readonly string[]).includes(t)
  );
}

// T014 — presign a short-lived R2 PUT for a captured video. The browser PUTs the bytes
// DIRECTLY to R2 (never through this server). Token-scoped + NON-consuming (the token
// stays open until submitCapture consumes it on send). Validates the token is open +
// unexpired, the content type, and the size.
export async function presignCaptureUpload(input: {
  token: string;
  contentType: string;
  sizeBytes: number;
}): Promise<
  | { status: "ok"; uploadUrl: string; key: string }
  | { status: "invalid"; reason: string }
  | { status: "closed" } // used / expired / unknown — ask for a fresh link
  | { status: "error" }
> {
  if (!isAllowedCaptureType(input.contentType)) {
    return { status: "invalid", reason: "That file format isn't supported." };
  }
  if (
    typeof input.sizeBytes !== "number" ||
    !Number.isFinite(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > CAPTURE_MAX_BYTES
  ) {
    return { status: "invalid", reason: "That clip is too large." };
  }

  const ctx = await getOpenCaptureContext(input.token);
  if (!ctx) return { status: "closed" };

  const key = captureMediaKey(
    ctx.workspaceId,
    `${randomUUID()}.${EXT_BY_TYPE[input.contentType]}`,
  );
  try {
    // PRIVATE captures bucket — the browser PUTs the bytes to the private customer-media
    // bucket (no public domain). The page flow is identical (it still gets { uploadUrl, key }).
    const uploadUrl = await presignCaptureUploadToR2(key, input.contentType);
    return { status: "ok", uploadUrl, key };
  } catch {
    return { status: "error" };
  }
}

export type SubmitCaptureResult =
  | { status: "ok" }
  | { status: "expired" }
  | { status: "used" }
  | { status: "not_found" }
  | { status: "invalid"; reason: string }
  | { status: "error" };

// The send write-path (T7.2 — US3). Order (P-VII + atomicity on neon-http, no interactive
// txn): consume (atomic single-use) → resolveDisplay(serverFloor, override) → one
// db.batch([proof, consent(granted, organic), basis(stub)]). A post-consume failure burns
// the token (no partial proof — the batch is atomic). The consume/batch core is UNCHANGED
// from Increment 1; this adds the VIDEO branch (proofType='video', mediaUrl=the R2 key).
export async function submitCapture(input: {
  token: string;
  path: "text" | "video" | "photo" | "audio"; // T7.2b — photo/audio wired
  text?: string;
  mediaKey?: string; // video/photo/audio — the R2 key from presignCaptureUpload
  displayOverride?: Partial<{ nameDisplay: NameDisplay; showFace: boolean }>;
}): Promise<SubmitCaptureResult> {
  // Validate the payload per path (before consuming the token).
  let proofType: "text" | "video" | "photo" | "audio";
  let quote: string | null = null;
  let transcript: string | null = null;
  let mediaUrl: string | null = null;

  if (input.path === "text") {
    const text = (input.text ?? "").trim();
    if (text.length === 0) {
      return { status: "invalid", reason: "Add a few words first." };
    }
    proofType = "text";
    quote = text; // testimony-verbatim — stored exactly as typed
  } else if (
    input.path === "video" ||
    input.path === "photo" ||
    input.path === "audio"
  ) {
    if (!input.mediaKey) {
      return { status: "invalid", reason: "Add your media first." };
    }
    // T7.2b — photo/audio REUSE the video media path verbatim: proofType tracks the path,
    // no transcription (a later tier), and mediaUrl persists the raw captures-bucket KEY
    // (T7.4a — never a public URL; the worker fetches by this key, photo resizes, audio
    // skips). writeCapturedProof emits media.captured with proofType (generic).
    proofType = input.path;
    transcript = null;
    mediaUrl = input.mediaKey;
  } else {
    return { status: "invalid", reason: "That option isn't available." };
  }

  // 1. Atomic single-use consume (a consumed/expired/unknown token yields null).
  const consumed = await consumeCaptureToken(input.token);
  if (!consumed) return { status: "used" };

  try {
    // 2. Resolve display against the SERVER-OWNED floor (more-private-only).
    const floor = await getWorkspaceDisplayDefault(consumed.workspaceId);
    const display = resolveDisplay(floor, input.displayOverride);

    // 3. Write the fixture-shaped proof + real granted (organic) consent + basis stub.
    await writeCapturedProof({
      workspaceId: consumed.workspaceId,
      sourceId: consumed.sourceId,
      requestId: consumed.requestId,
      customerName: consumed.customerName ?? "A customer",
      proofType,
      quote,
      transcript,
      mediaUrl,
      display,
    });

    revalidatePath("/app");
    revalidatePath("/app/proof");
    return { status: "ok" };
  } catch {
    // Token already consumed (single-use); the batch is atomic so NO partial proof exists.
    return { status: "error" };
  }
}
