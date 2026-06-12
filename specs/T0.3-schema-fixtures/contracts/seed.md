# Contract — Seed dataset (~15 fixtures)

Script: `src/db/seed.ts`, run via `npm run db:seed` (`node --env-file=.env.local`). **Re-runnable**:
reset-then-insert (delete in FK-safe order: consent → proof → source → workspace, then insert).

## What it creates

- **1 demo workspace** (e.g. `Lumen Candle Co.`, slug `lumen`) — owns everything (no auth yet).
- **Several sources** for that workspace, spanning kinds: `shopify`, `stripe`, `instagram`,
  `calendly`, `square` (label = a human name like "Shopify").
- **~15 proofs** with **at least one consent record each**.

## Distribution (must cover the UI states)

- **proofType**: all four — `text`, `video`, `photo`, `audio` — multiple of each.
- **consentState** (effective): all three — several `granted`, some `awaiting`, at least one
  `revoked` (modelled as ≥2 consent versions: an earlier `granted`, then a `revoked` version).
- **reviewed**: a mix of `true` / `false` (drives the "Unreviewed" stamp).
- **verified**: a mix (drives the persimmon "verified real customer" mark).
- **source**: spread across the seeded sources.
- **thumbnail**: null for media (neutral placeholder rendered); no real images.

## Quality bar

- Customer words are **realistic and on-brand** (real-sounding testimonials), never lorem. Examples
  in the spirit of the design-reference (e.g. "The monthly box is the only subscription I never even
  think about cancelling.").
- `customerName` uses first-name + initial (e.g. "Maria L."); **no real identifiable people**, no
  real photos/voices — media is a neutral placeholder.
- Each proof's consent has plausible `captureContext` and timestamps; `capturedAt` spread over
  recent dates.
- Microcopy clean (no "amazing"/"awesome", no emoji).

## Acceptance

- ~15 proofs seed with no error; each has a consent record and a source (SC-003).
- Effective consent gates Make: non-`granted` proofs offer no Make (SC-004).
- Re-running the seed neither duplicates nor errors (FR-012).
