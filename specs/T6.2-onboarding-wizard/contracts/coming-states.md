# Contract — Honest "coming" / preference states (P-XIII / P-XIV)

The wizard's first-run risk is faking capability. This contract fixes what is REAL vs honestly
deferred, and forbids dead controls and fabricated output.

## Step 2 — Connect a source

| Card | State | Behavior |
|---|---|---|
| Automation / "works with anything" (Zapier/Make/n8n/Pipedream → webhook) | **REAL** | Shows the workspace's real webhook URL + secret (`getOrCreateWebhookEndpoint`). A working config. |
| Thank-you page / QR / link | **REAL** if it maps to the existing capture link (T7.2/T7.3); otherwise honest "coming" | Port per design; wire to the existing link path if present, else "coming". |
| Shopify · Stripe · Instagram (native) | **COMING** | Honest "coming" affordance (reuse T7.3 `request-builder` copy). Selecting explains it isn't wired yet; user can still proceed. **No OAuth built.** |
| Forward order emails · Ask after delivery | **COMING** | Same honest "coming" affordance. |

- **No dead controls** (P-XIII): every card either does something real or clearly says "coming".
- **No fake success**: a "coming" card never simulates a connection.
- **Clean Sources seam**: the later Sources track attaches OAuth behind the native cards — same UI.

## Step 4 — First format

- The format tiles are **decorative concept-art** (design 4 has no preview/render text — research D3).
  Ported as **static illustration**.
- **No render, no fabricated preview** (P-XIV): selecting a format writes `first_format` and produces
  **no** clip and **no** personalized output. Rendering is T8.

## Step 5 — Tour

- Highlights the **real** dashboard regions. On a fresh workspace the masthead/numbers are the honest
  **zeroed** state (T6.1 empty) — the tour MUST NOT inject the design's sample Lumen/Maya numbers or
  proof (P-XIV).

## Step 3 — Brand preview

- The live preview renders from the merchant's **real entered** logo/colour/font — owned data only
  (P-XIV). No stock/AI-glossy placeholder presented as the user's brand.

## Verification hooks (quickstart)

- Inspect Step 2: webhook card shows a real secret; each native card shows "coming", none fakes
  success. Step 4: no clip/preview asset produced. Tour: zeroed masthead on an empty workspace.
