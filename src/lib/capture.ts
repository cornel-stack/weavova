// Capture-flow view shapes + constants (T7.2). CLIENT-SAFE: only type-only imports of
// DB-derived types (the clip.ts/proof.ts idiom) — no DB code reaches any bundle. These
// drive the public /c/[token] page (the ported design-reference/Weavova/Capture/ flow)
// and the token-scoped Server Actions. Owned data only (P-XIV).

import type { NameDisplay } from "@/lib/consent";

// The four proof paths the prompt (screen 01) offers. VIDEO + TEXT are wired in the
// T7.2 spine (video lands in Increment 2); PHOTO + AUDIO are honest "coming" states
// (P-XIII) — visible on the prompt, never dead controls, routed to a coming view.
export type CaptureProofPath = "video" | "text" | "photo" | "audio";

// Increment 1 wired TEXT; Increment 2 wires VIDEO (MediaRecorder + upload fallback).
// PHOTO/AUDIO remain honest "coming" states (T7.2b). The prompt shows all four — faithful
// to screen 01 — with the unwired ones rendering a "coming" state (P-XIII).
// T7.2b — ALL FOUR paths are wired (text + video spine; photo + audio this slice). The
// prompt shows all four live (screen 01); no "coming" state remains.
export const CAPTURE_WIRED_PATHS: CaptureProofPath[] = [
  "text",
  "video",
  "photo",
  "audio",
];
export const CAPTURE_COMING_PATHS: CaptureProofPath[] = [];

// Per-request token expiry (Q1 = 72h). Config-overridable via env at creation time.
export const CAPTURE_TOKEN_TTL_HOURS = 72;

// Allowed media content types for the capture upload. Kept here so the presign action +
// the client agree. VIDEO (spine) + IMAGE + AUDIO (T7.2b). All store a KEY in the PRIVATE
// captures bucket (T7.4a); the worker normalizes video/photo and skips audio.
export const CAPTURE_ALLOWED_VIDEO_TYPES = [
  "video/webm",
  "video/mp4",
  "video/quicktime",
] as const;
export type CaptureVideoType = (typeof CAPTURE_ALLOWED_VIDEO_TYPES)[number];

// Image types — includes HEIC/HEIF (iOS libraries commonly deliver it; the worker's ffmpeg
// re-encodes photos to JPEG, so HEIC input is normalized).
export const CAPTURE_ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const;
export type CaptureImageType = (typeof CAPTURE_ALLOWED_IMAGE_TYPES)[number];

// Audio types — the formats MediaRecorder emits across browsers.
export const CAPTURE_ALLOWED_AUDIO_TYPES = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
] as const;
export type CaptureAudioType = (typeof CAPTURE_ALLOWED_AUDIO_TYPES)[number];

// Any accepted capture media type (video ∪ image ∪ audio).
export type CaptureMediaType =
  | CaptureVideoType
  | CaptureImageType
  | CaptureAudioType;

// A sane ceiling for a short mobile clip (~60s). Generous but bounded; the server
// re-validates on presign. (Bytes never transit the app server regardless.)
export const CAPTURE_MAX_BYTES = 120 * 1024 * 1024; // 120 MB

// The brand a capture page wears (from the workspace brand kit; null-safe). Mirrors
// the BrandKitView essentials the public page needs — no secrets.
export interface CaptureBrand {
  logoAssetUrl: string | null;
  brandColor: string; // applied as a CSS var; contrastOn() derives the on-colour
  fonts: { display: string; body: string };
}

// What the public page needs to render the flow (no cross-workspace leak, no ids).
export interface CaptureRequestView {
  token: string;
  customerName: string | null; // brand-addressed prompt + thank-you
  workspaceName: string;
  brand: CaptureBrand | null;
  // the workspace display default the consent screen pre-fills; the customer may only
  // override toward MORE privacy (resolveDisplay enforces this server-side).
  display: { nameDisplay: NameDisplay; showFace: boolean };
  wiredPaths: CaptureProofPath[];
  comingPaths: CaptureProofPath[];
}

// Discriminated token resolution. T7.2b — expired/used carry the workspace NAME so screen 10
// can personalize ("{Workspace} can send you a fresh one"): the token genuinely maps to that
// workspace and the holder received the link from them, so this is not a leak. not_found has
// no row → no name (nothing to personalize; no enumeration).
export type CaptureResolution =
  | { status: "ok"; request: CaptureRequestView }
  | { status: "expired"; workspaceName: string }
  | { status: "used"; workspaceName: string }
  | { status: "not_found" };
