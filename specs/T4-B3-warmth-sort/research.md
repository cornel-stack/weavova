# Phase 0 — Research & Decisions: T4-B3 Warmth sort

All decisions are grounded in the codebase. None requires ratification (no new dep, no schema change,
no new route). The two design choices to review are §1 (the warmth function's honesty) and §3 (the
byte-stable opt-in-lazy mechanism).

---

## §1 — The warmth function: a transparent lexicographic order over owned facts

**Question**: how do completeness + un-tapped + recency combine, with consent as a gate, so the result
is honest and explicable (FR-002/003) and never reads like a fabricated metric?

**Decision**: a **lexicographic (tiered) order**, not a magic weighted sum. Per proof:
1. **Consent gate** — `granted = consentState === "granted"`. Granted proof ranks above all non-granted;
   non-granted (withdrawn **or** awaiting) is **cold**, ordered among itself by recency.
2. **Readiness points** (granted only) — `completeness + un-tapped`:
   - completeness: `+2` if `quote || transcript` (the customer's words), `+1` if `thumbnail` (media).
   - un-tapped: `+2` if no clip exists for the proof yet, else `+0`.
3. **Recency** — newer `capturedAt` first (tie-breaker within equal readiness; sole order among cold).
4. **`id` asc** — final deterministic tiebreak (FR-007 — no random order).

Compare descending on the tuple `(granted, readinessPoints, capturedAt)` then ascending `id`.

**Rationale**:
- **Honest / explicable (FR-019)** — every input is an owned fact; the order is narratable ("granted,
  has a full quote, not yet clipped, recent"). Lexicographic avoids inventing a continuous 0–100 number
  (which Q2:A already declines to show, and which would imply precision we don't have).
- **Consent-as-gate (P-VII)** — granted strictly outranks non-granted, so a withdrawn/awaiting proof is
  cold regardless of how fresh/complete it is (it can't become content), yet still appears.
- **Deterministic (FR-007)** — total order via the final `id` tiebreak.

**Weights are documented + tunable** at implement, but the **contract is the dominant ordering** (gate →
readiness → recency), not the exact point values. The points (2/1/2) encode "words > media" and
"un-tapped is a strong opportunity," both defensible and adjustable.

**Alternatives considered & rejected**:
- **Weighted numeric score (e.g. 0–100)** — rejected: false precision; reads like a metric we don't
  have, even computed; Q2:A declines to show a number anyway.
- **Pure recency with withdrawn sunk** (spec Q1 option C) — rejected by Q1:A (loses completeness +
  un-tapped, the real "content-readiness" nuance).
- **Recency as a weighted addend rather than a tiebreak** — rejected: makes a stale-but-rich proof
  outrank a fresh-but-rich one only via opaque weight tuning; lexicographic readiness-over-recency is
  clearer and still "composes" recency (it orders within equal readiness).

---

## §2 — Recency field: use `capturedAt` (already on `ProofView`), reconciling the spec's "proof.createdAt"

**Finding**: `ProofView` projects **`capturedAt`** (the customer-facing capture timestamp) and the
inbox's existing "Newest" sorts by it. `proof.createdAt` (row insert time) is **not** projected.

**Decision**: warmth's **recency = `capturedAt`** — the field already on `ProofView`, already the basis
of "Newest." This keeps warmth's recency **consistent with the existing sort** and needs **no shape
change** (FR-009). The spec's "proof.createdAt" was a loose reference to "the proof's recency"; the
projected, Newest-aligned field is `capturedAt`.

**Rationale**: byte-stable (no new projected field); consistent semantics (warmth's recency tiebreak
matches what the user already reads as "newest"); honest (a real owned timestamp).

---

## §3 — Opt-in-lazy clip-status: the additive read fires only on toggle to Warmest

**Question**: the **un-tapped** signal needs per-proof clip status, which is **not** on `ProofView`. How
to add it **without** (a) changing the `getProofs` shape, or (b) firing an extra read on the default
Newest path (Q3:A keeps Newest default)?

**Decision**: an **additive read behind an opt-in-lazy server action**:
- New read `getProofClipStatus(workspaceId): Promise<string[]>` — the proofIds with ≥1 `derived_asset`
  in the workspace (`select distinct proofId from derived_asset where workspaceId = $ws`). **Not**
  consent-filtered: "tapped" is a provenance fact ("you already made a clip from this"); withdrawn proof
  is gated cold by consent regardless. `withDbRetry`-wrapped. **`getProofs`, `getLibraryClips`,
  `ProofView` untouched.**
- New server action `getInboxClipStatus()` (`src/app/app/proof/warmth-actions.ts`, `"use server"`) —
  resolves the workspace server-side (`getCurrentWorkspace`, identity never trusted from client) and
  returns `getProofClipStatus(ws.id)`.
- `inbox-client` holds `tappedIds: Set<string> | null` (initial **null**). The action is invoked **only**
  inside the toggle path when switching to `"warmest"` with `tappedIds === null`. **Default Newest →
  the action is never called and the read never fires** (byte-stable default; the server `inbox-data`
  render is unchanged).
- While the fetch is in flight, the warmth branch **falls back to the Newest order** (no fabricated
  warmth); on resolve it re-sorts. A thrown read → honest fallback to recency (no crash). The cached
  `tappedIds` means a later toggle re-sorts without re-reading.

**Rationale**: satisfies opt-in laziness (Q3:A) and byte-stability (FR-009) simultaneously; the un-tapped
input is fetched precisely when warmth is engaged, and never otherwise.

**Alternatives considered & rejected**:
- **Eager projection** (add clip-status to `getProofs`) — rejected: changes the `ProofView` shape and
  fires the work on every default load (fails FR-009 + the opt-in-lazy requirement).
- **A new warmth-specific server read of the full proof list** — rejected: duplicates `getProofs`; the
  client already holds the `ProofView[]`, so only the missing clip-status map is needed.
- **Storing a warmth/clip-count column** — rejected: goes stale against recency/consent/clip changes;
  the spec mandates read-time compute, no stored warmth.

---

## §4 — Presentation & interaction (Q2:A / Q3:A)

**Decision**: **sort-order only, no per-proof badge** (Q2:A) — `ProofCard` is byte-unchanged. The
**toolbar** enables the existing "Warmest" `<select>` option (drops `disabled`, drops "— coming soon")
and `SortKey` becomes `"newest" | "warmest"`; the default stays **Newest** (Q3:A). A **one-line honest
explanation** sits with the control (e.g. helper text / `title`): "Warmest = most ready to become
content — recent, has a full quote or media, not yet clipped. Not a view or engagement prediction."
(FR-008; on-token `text-ink-3`, no emoji.)

**Rationale**: closest to the B3 reference (which shows warmth as the active sort, no per-card number);
the honesty copy discharges FR-008 without a badge; the smallest faithful change to the shipped toolbar.

---

## §5 — No dependency · no schema · no route (confirmations)

- **No new dependency**: warmth is comparison/arithmetic over owned fields; the clip-status read uses the
  existing Drizzle/Neon stack. `package.json`/lockfile unchanged.
- **No schema change**: read-time compute; the clip-status read selects existing `derived_asset` rows.
  No table/column/enum/migration; **no stored warmth**.
- **No new route**: the existing `/app/proof` inbox re-ordered; the rail (`src/lib/nav.ts`) untouched.

---

## Resolved unknowns

| Unknown | Resolution |
|---|---|
| How do the signals combine? | Lexicographic: gate → (completeness + un-tapped) → recency → id (§1). |
| Show a number/score? | No (Q2:A) — order only; honest one-line copy on the control (§4). |
| Recency field | `capturedAt` (on `ProofView`, the Newest basis) — reconciles "proof.createdAt" (§2). |
| Where does un-tapped come from? | Additive `getProofClipStatus` read behind an opt-in-lazy action (§3). |
| Does the default path do extra work? | No — `tappedIds` starts null; the read fires only on toggle (§3). |
| Consent handling | Reuse the effective state already on `ProofView` as the cold-gate; no new gate (§1, P-VII). |
| New dep / schema / route? | None / none / none (§5). |
