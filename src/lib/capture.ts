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
export const CAPTURE_WIRED_PATHS: CaptureProofPath[] = ["text", "video"];
export const CAPTURE_COMING_PATHS: CaptureProofPath[] = ["photo", "audio"];

// Per-request token expiry (Q1 = 72h). Config-overridable via env at creation time.
export const CAPTURE_TOKEN_TTL_HOURS = 72;

// Allowed media content types for the capture upload (video this slice's Increment 2;
// audio/photo are T7.2b). Kept here so the presign action + the client agree.
export const CAPTURE_ALLOWED_VIDEO_TYPES = [
  "video/webm",
  "video/mp4",
  "video/quicktime",
] as const;
export type CaptureVideoType = (typeof CAPTURE_ALLOWED_VIDEO_TYPES)[number];

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

// Discriminated token resolution — no workspace identifiers leak on a bad token.
export type CaptureResolution =
  | { status: "ok"; request: CaptureRequestView }
  | { status: "expired" }
  | { status: "used" }
  | { status: "not_found" };
