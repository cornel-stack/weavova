# Quickstart — Verifying T6.2 Onboarding Wizard

Validation guide (no implementation code). Proves the gate, the four steps' real/honest states, the
finish/skip → onboarded paths, and the tour.

## Prerequisites

- Migration applied: `npx drizzle-kit generate` then `npx drizzle-kit migrate` (adds
  `workspace.business_type`, `workspace.first_format`).
- A NULL-onboarded workspace: sign in as a brand-new user (T6.1 bootstrap creates one with
  `onboarded_at IS NULL`). The seeded Lumen owner is already onboarded (bypass test).
- `npm run dev`.

## Build gate

```
npm run build   # green
npm run lint
```

## Scenario A — Gate routes a new user into the wizard (FR-001)

1. As the NULL-onboarded user, navigate to `/app`.
2. **Expect:** redirected to `/onboard/role` (Step 1). No app surface renders.

## Scenario B — Walk all four steps, finish (US1 · FR-003/006/007/008)

1. Step 1: pick a business type → Continue. **DB:** `business_type` set (allowlist value).
2. Step 2: view the **real** webhook URL + secret; native connectors show honest "coming" → Continue.
3. Step 3: set colour + font (+ optional logo) → Continue. **DB:** brand kit written; logo (if any) is
   a **public** `assetUrlForKey` URL.
4. Step 4: pick a format → **Finish setup**. **DB:** `first_format` set; `onboarded_at` set.
5. **Expect:** land on `/app` with the spotlight tour active (`?tour=1`).

## Scenario C — Skip anytime → onboarded, no nag (US3 · FR-009/010)

1. Start the wizard; on Step 2 click **Skip for now**.
2. **Expect:** `onboarded_at` set; land in `/app`; reload → wizard does **not** reappear.
3. **DB:** only the steps acted on before skipping are persisted (untouched columns NULL).

## Scenario D — Seeded / onboarded user bypass (US4 · FR-002)

1. Sign in as the seeded Lumen owner (`onboarded_at` set).
2. **Expect:** straight to `/app`; visiting `/onboard/role` redirects back to `/app` (inverse gate).

## Scenario E — Step 2 honesty (US2 · FR-004/005 · P-XIII)

1. On Step 2, confirm the Automation/webhook card shows a **real** secret (a working config).
2. Select Shopify / Stripe / Instagram → honest "coming", no fake connection, can still proceed.
3. **Expect:** no dead control; no OAuth flow initiated.

## Scenario F — Step 4 honesty (US2 · FR-007 · P-XIV)

1. On Step 4, pick a format.
2. **Expect:** no clip rendered, no personalized preview — the tiles are static illustration; only the
   preference is saved.

## Scenario G — Tour (US5 · FR-012/013)

1. After Finish, the tour starts ("Tour · 1 of 5", "Your masthead…").
2. Next steps through 5; Skip tour dismisses. Refresh (no `?tour=1`) → no tour.
3. On a fresh empty workspace, the highlighted masthead shows the honest **zeroed** state — no
   fabricated sample numbers/proof.

## Resume (edge · research D5)

1. Start the wizard, set business type, close the tab (no skip).
2. Return to `/app` → redirected to `/onboard/role`; the business-type selection is **pre-filled**.

## Pass = all of

- A/D gate correctly (new → wizard; onboarded → app; inverse gate blocks re-entry).
- B persists business_type + brand kit + first_format + onboarded_at; finish → tour.
- C skip sets onboarded_at, no nag, no fabricated config.
- E/F honest (real webhook; native "coming"; no render/preview).
- G tour is a dismissible one-shot over the real (zeroed) dashboard.
- `npm run build` + `npm run lint` green.
