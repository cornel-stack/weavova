# Contracts — Capture token-scoped reads + Server Actions

All capture entry points are **token-scoped** — they resolve the workspace from the **token**, never
from a session (`getCurrentWorkspace` is NOT called). The token is the capability.

## Types — `src/lib/capture.ts` (client-safe)

```ts
export type CaptureProofPath = "video" | "text" | "photo" | "audio"; // video/text wired; photo/audio "coming"
export const CAPTURE_WIRED_PATHS: CaptureProofPath[] = ["video", "text"];
export const CAPTURE_COMING_PATHS: CaptureProofPath[] = ["photo", "audio"]; // honest coming-states (P-XIII)
export const CAPTURE_TOKEN_TTL_HOURS = 72;                                   // config-overridable
export const CAPTURE_ALLOWED_VIDEO_TYPES = ["video/webm", "video/mp4", "video/quicktime"] as const;
export const CAPTURE_MAX_BYTES = /* a sane mobile-clip ceiling */ 0;        // set in impl

// What the public page needs to render the flow (no secrets, no cross-workspace leak).
export interface CaptureRequestView {
  token: string;
  customerName: string | null;        // brand-addressed prompt / thank-you
  workspaceName: string;
  brand: {                            // from getBrandKit (null-safe)
    logoAssetUrl: string | null;
    brandColor: string;               // applied as a CSS var; contrastOn() derives the on-colour
    fonts: { display: string; body: string };
  } | null;
  // display defaults the consent screen pre-fills (override toward more privacy only)
  display: { nameDisplay: NameDisplay; showFace: boolean };
  wiredPaths: CaptureProofPath[];     // video/text
  comingPaths: CaptureProofPath[];    // photo/audio (honest coming)
}

// Discriminated resolution result (no workspace leak on bad tokens).
export type CaptureResolution =
  | { status: "ok"; request: CaptureRequestView }
  | { status: "expired" }            // minimal honest block (polished screen 10 → T7.2b)
  | { status: "used" }
  | { status: "not_found" };
```

## Read — `getCaptureRequestByToken` (`src/db/queries.ts`, public)

```ts
export async function getCaptureRequestByToken(token: string): Promise<CaptureResolution>;
```

- Looks up `capture_request` by `token`; joins workspace + brand kit (`getBrandKit`).
- Returns `expired` when `expires_at <= now()`, `used` when `status='used'`, `not_found` when unknown.
- Returns **no workspace identifiers** beyond what the page renders (name + brand). `withDbRetry`-wrapped.

## Consume (the atomic single-use guard) — `consumeCaptureToken`

```ts
// ONE conditional UPDATE — the atomic single-use + expiry guard. Returns the request context
// (workspace/source/customer/transaction) iff it was 'open' AND unexpired, else null.
export async function consumeCaptureToken(token: string): Promise<{
  requestId: string; workspaceId: string; sourceId: string;
  customerName: string | null; transactionRef: string | null;
} | null>;
// UPDATE capture_request SET status='used', used_at=now()
//   WHERE token=$1 AND status='open' AND expires_at > now()
//   RETURNING id, workspace_id, source_id, customer_name, transaction_ref
```

## Server Action — `presignCaptureUpload` (`src/app/c/[token]/actions.ts`)

```ts
export async function presignCaptureUpload(input: {
  token: string; contentType: string; sizeBytes: number;
}): Promise<
  | { status: "ok"; uploadUrl: string; key: string }
  | { status: "invalid"; reason: string }
  | { status: "expired" | "used" | "not_found" }
  | { status: "error" }
>;
```

- Validates the token is **open + unexpired** (a READ — not a consume); validates content type
  (`CAPTURE_ALLOWED_VIDEO_TYPES`) + size (`CAPTURE_MAX_BYTES`); resolves workspace from the request.
- Signs an R2 PUT URL with `captureMediaKey(workspaceId, \`${uuid}.${ext}\`)` (reuse `presignPut`).
- The **browser PUTs the bytes directly to R2**; the server never sees them.

## Server Action — `submitCapture` (the write-path) (`src/app/c/[token]/actions.ts`)

```ts
export async function submitCapture(input: {
  token: string;
  path: "video" | "text";                      // photo/audio are coming (rejected honestly here)
  text?: string;                               // text path — verbatim, non-empty
  mediaKey?: string;                           // media path — the R2 key from presignCaptureUpload
  displayOverride?: Partial<{ nameDisplay: NameDisplay; showFace: boolean }>; // more-private-only
}): Promise<
  | { status: "ok" }                           // thank-you (06)
  | { status: "expired" | "used" | "not_found" } // honest block
  | { status: "invalid"; reason: string }      // empty text / missing media / coming path
  | { status: "error" }                        // post-consume failure (token burned — ask for a new link)
>;
```

**Write-path (the contract):**
1. `consumeCaptureToken(token)` → null ⇒ return `used`/`expired`/`not_found` (no writes).
2. Validate payload (non-empty text **or** a present `mediaKey`; reject `photo`/`audio` honestly).
3. `display = resolveDisplay(workspaceDefault, displayOverride)` (T7.1 — sole sanctioned write path; the
   workspace default read from the consumed request's workspace).
4. `db.batch([ insert proof, insert consent(granted, organic-only, display), insert verification_basis(
   consentCapturedAt=now, transactionVerifiedAt=null) ])` — client-generated UUIDs; **one transaction**.
5. `revalidatePath` the owner inbox/dashboard.
6. On batch failure → return `error` (token already consumed; **no partial proof** — batch is atomic).

**Invariants enforced here**: least-privilege (`useScope=['organic']`); display never less private than
the workspace default (via `resolveDisplay`); testimony-verbatim (text stored as typed); no verified
stamp (`transactionVerifiedAt` null, `proof.verified=false`).

## Dev-only — `listCaptureRequests` + link display

```ts
export async function listCaptureRequests(workspaceId: string): Promise<Array<{
  token: string; status: string; expiresAt: string; customerName: string | null;
}>>;
```

Surfaced on the existing **dev-only** `styleguide/data` page (404 in prod) as **copyable `/c/[token]`
links** (QR per C1). NOT a ported merchant surface (05/06 → T7.4).

## R2 helper — `src/lib/r2.ts` (additive)

```ts
export function captureMediaKey(workspaceId: string, suffix: string): string; // e.g. `cap/${workspaceId}/${suffix}`
```
