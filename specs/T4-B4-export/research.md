# Phase 0 — Research & Decisions: T4-B4 Export

Resolves the open technical questions before design. §1 (dependency) is the **one determination to
ratify**; §2 (manifest format) is a non-blocking recommendation; §3–§7 are decisions grounded in the
codebase.

---

## §1 — THE DEPENDENCY DETERMINATION (ratify this) — finding: ZERO new dependencies

**Question (the user's primary review item)**: does export need any new dependency — specifically a
zip lib for bulk — or is there a clean no-dep path?

**Decision**: **No new dependency.** Both mechanisms use native Web platform APIs already available
in the browser; the manifest is **one text file**, not N files, so **no zip is needed**.

- **Single — copy to clipboard**: `navigator.clipboard.writeText(text)` — native, no dep. (A-11:
  genuinely copies. Fallback below for the rare unavailable case.)
- **Bulk — download one manifest**: build one string server-side (the `exportClips` action), return
  it, and on the client create a `Blob`, `URL.createObjectURL`, an `<a download>`, click it, then
  `URL.revokeObjectURL`. This is the standard zero-dependency browser download. No `file-saver`.
- **Manifest content**: `JSON.stringify(...)` (native). No CSV lib; if CSV is chosen (see §2) it is a
  trivial hand-rolled join with proper quoting — still no dep.

**Why no zip**: a zip is only justified when exporting **N binary files** (e.g., N rendered videos).
B4 exports **no video files** (the video is a labeled sample reference, Q2:A) and the post-text is
**one manifest**. One text artifact ⇒ a single `Blob` download ⇒ no archiver.

**Rationale**: matches the user's strong preference for the no-dep path; keeps the locked-stack rule
(P-III) intact; nothing about the slice is cleaner with a library than without.

**Alternatives considered & rejected**:
- `jszip` / `archiver` — rejected: only needed for multi-file bundles; we have one text file.
- `file-saver` — rejected: the native `Blob` + anchor pattern is ~5 lines and already idiomatic.
- Per-clip sequential downloads (N files) — rejected: noisy UX (N "save" prompts / popup-blocker
  issues) and pointless when one manifest carries everything; one file is cleaner and honest.

> **STOP condition for implementation**: if implementation surfaces a genuine reason a zip/library is
> needed (it should not), **halt and surface it for ratification** exactly as `aws4fetch` was in B2 —
> do **not** add it unilaterally. The plan's position is that no such reason exists.

---

## §2 — Manifest format: JSON (recommended) vs CSV — non-blocking

**Question**: the bulk manifest is "one CSV or JSON" — which?

**Decision (recommendation, ratify or override at review)**: **JSON**.

**Rationale**:
- **Fidelity & safety**: customer quotes routinely contain commas, double-quotes, and newlines —
  exactly the characters that make CSV escaping error-prone. JSON handles them losslessly with zero
  hand-rolled quoting risk (`JSON.stringify`).
- **Structure**: the package is naturally nested (clip + proof + attribution + the labeled sample
  reference + a rendered `postText` string). JSON preserves that; CSV flattens and loses the sample
  labeling nuance.
- **Honesty**: a JSON field `sampleVideo: { status: "arrives_at_T8", note: "…", reference: "r2://…"
  }` cannot be mistaken for a finished-clip download column.

**Alternative — CSV**: more spreadsheet-friendly for a non-technical user who wants a row-per-clip
table. If chosen, the manifest is `headline, hook, customer, verified, source, format, created,
sample_note` with RFC-4180 quoting. **Still no dependency.** Left as an override option; not blocking.

**Note**: neither format is the "paste-into-your-post" path — that is the **single** copy flow. The
bulk manifest is a **batch handoff / record** of the selected clips' post-text, not a single caption.

---

## §3 — The customer headline gap (drives the new read)

**Finding**: the post-text package's centerpiece — the customer's **verbatim proof** (P-II) — is
**absent** from both existing clip read shapes:
- `ClipDetailView` (`getClip`, `queries.ts`): has `hook`, `customerName`, `verified`, `proofType`,
  `source` — **no** `quote`/`transcript`.
- `LibraryClipView` (`getLibraryClips`): has `hook`, `customerName`, `verified` — **no** headline,
  **no** source.

The columns exist on `proof` (`proof.quote`, `proof.transcript` — confirmed in `ProofView`), they are
simply not projected into the clip reads.

**Decision**: add **new** consent-gated reads `getClipExport` (single) and `getClipExports` (bulk)
that join `derived_asset → proof (→ source)` and select the owned post-text columns **including the
headline**. The existing `getClip` / `getLibraryClips` and their shapes stay **byte-unchanged**
(FR-008). The headline is `proof.quote ?? proof.transcript ?? null` (photo proofs may have neither →
the package still produces hook + attribution; never fabricates — edge case in spec).

**Rationale**: keeps every shipped read shape byte-stable while giving export the field P-II requires.
One purpose-built read is cleaner than widening a shared shape consumed elsewhere.

---

## §4 — Single export: assemble at render, copy synchronously (gesture-safe), no server action

**Question**: how does single copy honor "re-check consent at read time" (P-VII) while keeping the
clipboard write gesture-safe (A-11)?

**Decision**: the clip-detail **page render is the read-time gate**. The page already only exists for
a **granted** clip (`getClip` returns `null` for a withdrawn clip → `notFound()`). `clip-detail-data`
performs an **additional** consent-gated read (`getClipExport`) and passes the assembled `text` to a
small client island; the island copies it **synchronously inside the click gesture**
(`navigator.clipboard.writeText`). **No server round-trip on click** ⇒ no lost user-activation ⇒
reliable copy across browsers.

**Why not a click-time server action for single**: an async action between click and clipboard write
can drop the user-activation in stricter browsers (Safari), risking a dead control (violating A-11).
Since the single surface is already consent-gated at render, the gated render data is the correct,
honest source. (The "withdrawn after the page loaded" race is meaningful for the **bulk list**, not a
single already-gated detail page — handled in §5.)

**Fallback (A-11 guarantee)**: if `navigator.clipboard` is unavailable/blocked, the island reveals
the post-text in a focused, pre-selected `<textarea readonly>` (or `document.execCommand('copy')`
path) so the user can always copy manually — the control is **never dead**.

---

## §5 — Bulk export: a Server Action re-reads consent at action time (the B1 race)

**Decision**: `exportClips(clipIds: string[])` is a `"use server"` action (new
`src/app/app/library/actions.ts`) that:
1. resolves the workspace server-side (`getCurrentWorkspace` — identity never trusted from client),
2. calls `getClipExports(workspace.id, clipIds)` — the **consent-gated** read (shared
   `effectiveConsentGranted`), which returns **only** clips whose source proof is **currently**
   granted,
3. computes the **honest tally**: `requested` ids minus returned ids = **skipped** (consent withdrawn
   / not found / cross-workspace — the same three-into-one opacity as `getClip`),
4. builds **one manifest string** (`buildManifest`) from the returned packages,
5. returns `{ manifest, filename, made, skipped, items }` for the client to download + report.

**The race is handled**: because the read happens **at action time**, a clip granted at select but
withdrawn before "Export selected" is **absent → skipped** — never exported. This is the **exact B1
pattern** (`generateBatch` re-checks `getGrantedConsentId` per proof at generate), applied to a read
instead of a write. No new gate is introduced.

**Why an action (vs assembling at Library render like single)**: the Library lists many clips; the
selection + re-check must reflect the moment of export, and the action also produces the manifest
string server-side (where the consent-gated data lives). The client only triggers the download.

---

## §6 — Bulk selection UI: port B1's inbox-selection pattern onto the byte-stable clip card

**Decision**: mirror `InboxClient` / `InboxSelectionBar` (T4-B1) for the Library:
- `library-data.tsx` renders a new client `LibraryClient` (wrapping the existing grid) instead of
  `LibraryGrid` directly. `LibraryClient` owns `selecting` (bool) + `selected` (`Set<string>`),
  `toggleSelecting` / `toggleClip` / `selectAll` / `exitSelection` — the same shape as `InboxClient`.
- The **selection control is a sibling overlay** on each card (exactly as B1 adds selection *around*
  the byte-unchanged `ProofCard`, e.g. the inbox's stretched-link pattern) — the `LibraryClipCard`
  **props/shape are unchanged** (FR-009). The overlay (a checkbox/selected ring) is rendered by the
  grid wrapper around the card, gated by `selecting`.
- A sticky `LibrarySelectionBar` (the B1 `InboxSelectionBar` layout: `sticky bottom-4`, `bg-card`,
  `shadow-modal`, on-token type) shows the selected count, "Select all", "Export selected" (the
  persimmon primary), "Cancel", and the **honest result line** after export.

**Rationale**: the pattern is already shipped, tokens-correct, and keyboard-accessible; porting it
keeps P-V and avoids inventing a Library-specific selection model. There is **no format picker** here
(export is read-only — unlike B1's batch generate), so the bar is simpler.

**Entry to selection mode**: a "Select" toggle in the Library header area (added by `LibraryClient`),
parallel to the inbox toolbar's selection toggle. (The Library header today has no toolbar; this is
the minimal additive affordance — documented as derived, no design-reference to port.)

---

## §7 — The honest T8 video seam in the payload (Q2:A)

**Decision**: the video is represented in the package **only** as an openly-labeled sample reference —
a constant note ("sample — your rendered clip replaces this when rendering ships (T8). This is not a
finished clip of the customer.") plus, in the JSON manifest, a clearly-labeled `sampleVideo` object
carrying the existing `SAMPLE_CLIP_URL` reference **as a sample**, never as a finished-clip URL and
never as a downloadable file. `SAMPLE_CLIP_URL`, `src/lib/clip.ts`, and the stubbed surfaces are
**untouched** (Q2:A). The copied single-clip text ends with the same labeled sample line.

**Rationale**: honesty (FR-003/FR-019) — the consumer of an export must not be able to mistake the
sample for the finished clip; the seam stays exactly where T8 will swap in the real render.

---

## Resolved unknowns

| Unknown | Resolution |
|---|---|
| New dependency for bulk? | **No** — native clipboard + native Blob; one manifest, no zip (§1). |
| Manifest format | **JSON** recommended (fidelity/safety); CSV offered as override (§2). |
| Where does the headline come from? | New consent-gated read selecting `proof.quote ?? proof.transcript` (§3). |
| Single copy gesture safety | Assemble at render, copy synchronously, no click-time action; textarea fallback (§4). |
| Bulk consent race | `exportClips` re-reads at action time via the shared gate (B1 pattern) (§5). |
| Selection without changing the card | Sibling overlay via `LibraryClient`/grid wrapper (B1 pattern) (§6). |
| Video in the payload | Openly-labeled sample reference only; `SAMPLE_CLIP_URL` untouched (§7). |
| Schema change? | **None** — read + produce over existing columns. |
| New route / nav entry? | **None** — single on `/app/clip/[id]`, bulk on `/app/library`. |
