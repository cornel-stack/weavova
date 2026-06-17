# Quickstart — T2.4b Clip Studio (validation guide)

How to validate the slice end-to-end and check the Definition of Done. No implementation code here — see
`plan.md`, `data-model.md`, and `contracts/`. Prerequisite: **T2.4a shipped** (it has — `derived_asset`
exists and is seeded; the dashboard/detail clip reads are live).

## Setup

```bash
npm install                 # no new dependency expected vs the lockfile
# DB already migrated + seeded from T2.4a. To re-seed (relative dates, re-runnable):
npm run db:seed
npm run dev                 # http://localhost:3000
```

## Walkthrough

1. **Open from a granted proof** — Dashboard/inbox → a **granted** proof (e.g. Maria L., Aisha K.) →
   detail → **"Make a clip"**. The studio opens at `/app/proof/[id]/studio` inside the AppChrome (rail/
   top-bar intact), with a close affordance back to the proof. (US1)
2. **Configure** — confirm exactly **Format** (default 9×16; 1×1 / 4×5 / 16×9 selectable) + an **editable
   hook** (clearly the brand's words, separate from the customer's quote) + **Generate**. Confirm **no**
   timeline/track/scrubber, **no** cutaway/music/multi-brand-kit/scene controls, **no** AI suggestions, no
   metrics. Change format / edit the hook → reflected. (US1, US4, SC-002, SC-005)
3. **Generate** — activate Generate → the **press-run** animation plays (settles instantly with
   `prefers-reduced-motion` on) → a result reveals **explicitly labelled a sample / preview** standing in
   for the real render; it does **not** claim to be a render of the customer's words; same sample
   regardless of format/hook (limitation surfaced). (US2, SC-001, SC-003)
4. **See it land** — return to the proof detail → the clip appears under **"Generated assets"**; the
   **Dashboard** "clips this month" increments and the latest-clip shows this customer (via T2.4a's reads,
   no code edit). (SC-008)
5. **Consent re-check blocks** — to exercise the gate without a revocation UI (not built until T7), edit the
   seed so the chosen proof's effective consent is `revoked` (or use Leo M., already granted→revoked),
   re-seed, open the studio for that proof directly at `/app/proof/[id]/studio`, and Generate → an honest
   **consent-required** state, **no clip produced**, **no `derived_asset` row written**. Confirm a
   directly-reached studio for a non-granted proof shows the same (gate at the studio). (US3, SC-004)
6. **Withdrawal still cascades** — for a proof that already has a generated clip, flip its consent to
   `revoked` in the seed + re-seed → the clip **disappears** from the detail + dashboard (T2.4a read-time
   withdrawal), while its row is retained. (SC-008)
7. **States** — throttle/offline to force a cold start on open → transparent `withDbRetry` recovery; force
   a persistent failure → the shared `<ErrorState>` with retry (no raw text); a bad/cross-workspace id →
   the tenant-isolated not-found (no leak); close → back to the proof, chrome intact. (US5, SC-006)
8. **Responsive + keyboard** — at ≤480 / 1024 / 1280 (+1240 max) the preview + config panel reflow with no
   horizontal scroll/overlap; the whole flow (open → Format → hook → Generate → close) is keyboard-operable
   with visible focus. (SC-007)

## Definition of Done — gates

- [ ] **No editor (P-VIII / SC-002)**: only Format + hook + Generate (+ close); 0 timeline/track/scrubber.
- [ ] **Honest stub (FR-007 / SC-003)**: result clearly a sample/preview; no fabricated customer
      words/voice/footage/captions; same sample across all four proof types and any config.
- [ ] **Consent re-check (P-VII / FR-008 / SC-004)**: 0 clips written for a non-granted proof, including
      revoked-after-open and directly-reached non-granted studio; the consent-required state is honest.
- [ ] **Persistence via T2.4a (FR-009 / SC-008)**: a consent-passed Generate writes one `derived_asset`
      row (kind `clip`, chosen `format`, `hook`, `SAMPLE_CLIP_URL`, the re-checked `consentId`) and the
      detail + dashboard reflect it through T2.4a's reads; revocation withdraws it.
- [ ] **No fabricated controls/metrics (FR-011/012 / SC-005)**: no cutaways/music/multi-brand-kit/scene
      timeline/AI suggestions; no view/reach/engagement/warmth.
- [ ] **Reliability (FR-013/014 / SC-006)**: `withDbRetry` recovery on reads; shared `<ErrorState>` on
      persistent failure; honest not-found; clean open/close.
- [ ] **Responsive + keyboard (FR-015/016 / SC-007)**: reflows at every breakpoint; fully keyboard-operable.
- [ ] **Byte-stability (FR-018)**: ProofCard, `ProofView`/`getProofs`/`getProof`/`ProofDetailView`, and all
      T2.4a reads byte-unchanged (`git diff` shows only additions + the one `proof-detail-actions.tsx`
      wiring edit + the optional seed import); **no schema change**; chrome untouched.
- [ ] **No new dependency**: `package.json` unchanged; the press-run is CSS/token-driven; validation is
      hand-rolled (no Zod — D8).
- [ ] **Build green without `DATABASE_URL`**: `npm run typecheck` + `npm run lint` + `npm run build` pass
      with `.env.local` moved aside (mirroring CI; lazy db client).

## Hand-off

Implementation will **leave every change uncommitted** — Cornel reviews and commits manually on the
`T2.4b-clip-studio` branch (no auto-commit/push/merge), mirroring the T2.4a hand-off.
