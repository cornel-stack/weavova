# Contract — Home Surface "/"

The only interface this slice exposes is the rendered landing at the route "/". This is the UI
contract the implementation must satisfy and that quickstart validates.

## Route

- **Path**: `/`
- **Type**: Server Component (no client interactivity; no `"use client"`).
- **Rendering**: static — must render fully without JavaScript and remain legible (Edge Case:
  no-JS / reduced-motion).

## Required content (and ONLY this)

| Element | Requirement |
|---|---|
| Background | Warm Pressroom paper `#F7F2E8` fills the viewport. |
| Wordmark | The text **"Weavova"**, set in **Fraunces** (`--font-display`). |
| Tagline | The verbatim text **"The customer is the headline."**, set in **Fraunces** (`--font-display`). |
| Layout | The wordmark and tagline are the only content, visually centred. No other elements. |

## Font wiring guarantees

- `--font-display` resolves to **Fraunces**, loaded via `next/font/google`.
- `--font-ui` resolves to **Hanken Grotesk**, loaded via `next/font/google`, and is the document's
  default UI font (applied to `body`).
- `--font-mono` / JetBrains Mono is **absent** in this slice (deferred to T0.2).

## Must be absent (out of scope this slice)

- No navigation, header, footer, links, or buttons.
- No persimmon accent (there is no primary action and no "verified real customer" mark on this
  page — Principle IV scarcity rule).
- No product UI, data, fixtures, images/logo assets, auth, storage, jobs, or email.
- No colour-token system, spacing scale, dark mode, or styleguide (all T0.2).

## Acceptance (maps to spec)

- Satisfies **FR-004**, **FR-004a**, **FR-005**.
- Verified by **SC-001** (content + background) and **SC-001a** (fonts + variables present;
  nothing deferred is introduced).

## Microcopy

- Only the wordmark and the tagline. No "amazing"/"awesome", no emoji (Principle XI).
