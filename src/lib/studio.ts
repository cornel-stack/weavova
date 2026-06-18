// Clip-studio config + Generate contract (T2.4b). Shared by the client studio
// form and the Generate Server Action. NO runtime schema import here (this module
// is pulled into the client bundle) — ClipFormat is a type-only import, and the
// runtime format list is a literal checked against that type via `satisfies`.

import type { ClipFormat } from "@/lib/clip";

// The owned render-contract `Format` aspect set (render spec §4). Literal so it
// stays client-safe; `satisfies` ties it to the schema-derived ClipFormat type, so
// a drift from the `clip_format` enum is a compile error.
export const FORMATS = ["9x16", "1x1", "4x5", "16x9"] as const satisfies readonly ClipFormat[];

export const DEFAULT_FORMAT: ClipFormat = "9x16";

// Picker options (value + display label). The only configuration controls the
// studio exposes besides the hook (Q3→A / FR-004) — NOT screen-04's template
// presets (those are a T8 template-family concern).
export const FORMAT_OPTIONS: { value: ClipFormat; label: string }[] = [
  { value: "9x16", label: "9 : 16" },
  { value: "1x1", label: "1 : 1" },
  { value: "4x5", label: "4 : 5" },
  { value: "16x9", label: "16 : 9" },
];

// The brand-authored hook is bounded (owned provenance). Empty → null (FR-005).
export const HOOK_MAX_LENGTH = 120;

// What the client sends to the Generate action.
export interface GenerateInput {
  proofId: string;
  format: ClipFormat;
  hook: string;
}

// The persisted/echoed clip the result reveals — configured provenance + the
// stubbed sample reference. NOT a render of the customer's words (FR-019).
export interface GeneratedClip {
  format: ClipFormat;
  hook: string | null;
  assetUrl: string;
  createdAt: string;
}

// The Generate action's typed result — a discriminated union the client switches on.
export type GenerateResult =
  | { status: "generated"; clip: GeneratedClip }
  | { status: "consent_required" }
  | { status: "error" };

// Hand-rolled input guard (D8 — NO Zod; Zod is not a dependency and the slice adds
// none). Validates BOTH inputs server-side — never trust the client: `format` must
// be a known ClipFormat, `hook` must be a string within the cap (trimmed; '' → null),
// `proofId` non-empty. Returns the normalised input, or null on any violation.
export interface ValidatedGenerateInput {
  proofId: string;
  format: ClipFormat;
  hook: string | null;
}

function isClipFormat(value: unknown): value is ClipFormat {
  return typeof value === "string" && (FORMATS as readonly string[]).includes(value);
}

export function validateGenerateInput(raw: unknown): ValidatedGenerateInput | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { proofId, format, hook } = raw as Record<string, unknown>;

  if (typeof proofId !== "string" || proofId.length === 0) return null;
  if (!isClipFormat(format)) return null;
  if (typeof hook !== "string") return null;

  const trimmed = hook.trim();
  if (trimmed.length > HOOK_MAX_LENGTH) return null;

  return { proofId, format, hook: trimmed.length === 0 ? null : trimmed };
}

// ── Batch (T4-B1) ────────────────────────────────────────────────────────────
// The bulk form of Generate: one clip per selected proof, each re-checked for
// consent at generate (P-VII) and written via the SAME primitives as generateClip
// (single-attempt insert, the guard above, the shared SAMPLE_CLIP_URL). The result
// is an HONEST per-proof outcome — no all-or-nothing rollback, no fabricated
// success (FR-019). The single-clip GenerateInput/GenerateResult above are unchanged.

export interface GenerateBatchInput {
  proofIds: string[];
  format: ClipFormat;
}

export type BatchSkipReason = "needs_consent";

export interface BatchItemResult {
  proofId: string;
  status: "made" | "skipped" | "error";
  reason?: BatchSkipReason;
}

export interface BatchResult {
  made: number;
  skipped: number;
  failed: number;
  items: BatchItemResult[];
}
