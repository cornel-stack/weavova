# Contract — Post-text package & produced artifacts (`src/lib/export.ts`)

Client-safe module (type-only schema imports, like `clip.ts`/`studio.ts`). Pure; no DB code. Owned
data only — **no** view/reach/engagement/performance metric (FR-019). The video appears **only** as
an openly-labeled sample reference, **never** a finished clip (FR-003, Q2:A).

## Types

```text
PostTextPackage {
  clipId: string
  proofId: string
  headline: string | null          // proof.quote ?? proof.transcript — the customer's verbatim words (P-II)
  hook: string | null              // brand-authored caption line
  customerName: string
  verified: boolean
  source: string
  proofType: ProofType             // type-only from schema
  format: ClipFormat               // type-only from schema
  createdAt: string                // ISO
  sampleVideo: { status: "arrives_at_T8"; note: string; reference: string }
}

SingleExportText = string          // formatPostText output (the clipboard payload)

ExportManifest {                   // buildManifest output (parsed view; serialized to JSON string)
  exportedAt: string               // ISO, stamped by the action
  count: number
  clips: Array<PostTextPackage & { postText: string }>
}
```

## Constants

```text
SAMPLE_VIDEO_NOTE =
  "sample — your rendered clip replaces this when rendering ships (T8). Not a finished clip of the customer."
```
The `reference` in `sampleVideo` is the existing `SAMPLE_CLIP_URL` (imported as a labeled sample;
`src/lib/clip.ts` stays byte-unchanged).

## `formatPostText(pkg: PostTextPackage): string`

Pure assembly; on-token microcopy; no emoji; never fabricates a missing field.

```text
[ headline ]                                  ← if headline != null
                                              ← blank line separator (only between present blocks)
[ hook ]                                       ← if hook != null
— {customerName}{verified ? ", verified customer" : ""} · via {source}
                                              ← blank line
[{SAMPLE_VIDEO_NOTE}]                          ← always present (square-bracketed; clearly a note, not the post body)
```

Rules:
- The **headline leads** (the customer is the headline — P-II). If `headline` is null, the text
  begins with the hook (if any) then attribution.
- Present blocks are joined with a single blank line; absent blocks are skipped (no empty lines, no
  placeholder text).
- The attribution line always renders (there is always a `customerName` + `source`).
- The sample note always renders, bracketed, so an export consumer cannot mistake the sample for the
  finished clip.

**Example** (granted text proof, hook set, verified):
```text
My whole flat smells like a spa now — I've already repurchased three times.

The only subscription I never think about cancelling.
— Maria L., verified customer · via Shopify

[sample — your rendered clip replaces this when rendering ships (T8). Not a finished clip of the customer.]
```

## `buildManifest(pkgs, exportedAt): string`

Returns `JSON.stringify(ExportManifest, null, 2)`. Each entry is the full `PostTextPackage` plus a
`postText` field (`formatPostText(pkg)`) so the manifest is both structured and paste-ready per clip.
`exportedAt` is passed in by the Server Action (server-side timestamp). No metric fields. The
`sampleVideo` object keeps the video honestly labeled.

**Format**: JSON (research §2 — fidelity/safety with quotes containing commas/newlines). CSV is the
documented override; if chosen, columns are `headline,hook,customer,verified,source,format,created,
sample_note` with RFC-4180 quoting — still no dependency.

## Honesty invariants (binding)

- No field is a metric (FR-019).
- `sampleVideo.reference` is **labeled a sample**; it is never emitted as a finished-clip URL and is
  never turned into a downloadable file. No real video bytes leave (Q2:A).
- Nothing is fabricated to fill a null `headline`/`hook`.
