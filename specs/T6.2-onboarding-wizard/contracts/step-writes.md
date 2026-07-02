# Contract — Per-step writes & reuse map

Each step names its binding design and its write path. Reuse is explicit; nothing is rebuilt.

| Step | Route | Design (binding) | Reads | Writes | New code? |
|---|---|---|---|---|---|
| 1 Business type | `/onboard/role` | `1 _ Business type  _onboard_role` | — | `business_type` via `setWorkspaceBusinessType` (allowlist) | new action + query |
| 2 Connect source | `/onboard/source` | `2 _ Connect a source  _onboard_source` | `getOrCreateWebhookEndpoint(workspaceId)` (real URL+secret) | — (webhook already exists; native = "coming") | new UI only |
| 3 Brand quickstart | `/onboard/brand` | `3 _ Brand quickstart  _onboard_brand` | current brand kit (pre-fill) | logo → `presignBrandKitLogoUpload` (PUBLIC bucket) then `saveBrandKit` (`upsertBrandKit`) | **reuse existing brand actions** |
| 4 First format | `/onboard/format` | `4 _ First format  _onboard_format` | — | `first_format` via `setWorkspaceFirstFormat` (allowlist) | new action + query |
| Finish / Skip | (any step) | — | — | `markWorkspaceOnboarded` → `onboarded_at = now()` | new action + query |
| 5 Tour | `/app?tour=1` | `5 _ Dashboard spotlight tour` | real dashboard | — (client overlay, no persistence) | new overlay component |

## Step actions (`src/app/onboard/actions.ts`)

- `saveBusinessType(value)` → resolve workspace (`getCurrentWorkspace`) → `setWorkspaceBusinessType`.
- `saveFirstFormat(value)` → resolve workspace → `setWorkspaceFirstFormat`.
- `finishOnboarding()` → `markWorkspaceOnboarded` → redirect `/app?tour=1`.
- `skipOnboarding()` → `markWorkspaceOnboarded` → redirect `/app` (no tour).
- Step 3 delegates to the **existing** `presignBrandKitLogoUpload` + `saveBrandKit` (no new brand
  action). All actions resolve the workspace server-side via `getCurrentWorkspace()` — never trust a
  client-supplied workspace id (multi-tenant safety).

## Rules

- Writes are **independent** (INV-2): completing a step persists only that step. Continue advances the
  route; Back returns; neither fabricates config for a step not acted on.
- Logo is **public** (`assetUrlForKey`), never the private captures bucket (INV-4).
- Copy is verbatim from the design files (P-XVII).
