# Contract — Request actions + Resend send (`src/app/app/requests/actions.ts`, `src/lib/resend.ts`)

All actions are **authenticated, workspace-scoped** server actions (NOT token-scoped). Each resolves
`getCurrentWorkspace()` and writes/reads only that workspace's rows (two-layer with the middleware
gate, D7). None of these touch the public `/c/[token]` page.

## `src/lib/resend.ts` — thin transactional send helper (D2)

```text
sendCaptureRequestEmail(input: {
  to: string;                 // recipient (validated upstream)
  workspaceName: string;
  brand: { logoUrl?: string|null; brandColor?: string|null } | null;  // brand-framed
  captureUrl: string;         // absolute https://…/c/<token>
  message?: string;           // optional merchant note (ref 23) — verbatim, not model-authored
}): Promise<{ ok: true; providerId?: string } | { ok: false; error: string }>
```

- Sends `POST https://api.resend.com/emails` with `Authorization: Bearer ${AUTH_RESEND_KEY}`, JSON
  `{ from: AUTH_EMAIL_FROM, to, subject, html }`. Server-only; the key never reaches a bundle.
- **Email composition**: brand-framed (workspace name + brand colour/logo if present; neutral
  Pressroom fallback otherwise), a single primary CTA linking to `captureUrl`, "powered by Weavova"
  footer. No tracking pixels/links (C5 — we don't store opens/clicks).
- Returns `ok:false` with a message on any non-2xx / network error — the caller decides the honest
  state (never throws past the action).
- **Env**: reuse `AUTH_RESEND_KEY` + `AUTH_EMAIL_FROM` (C4). A request-specific sender would add
  `REQUEST_EMAIL_FROM` + a verified domain — out of scope; flagged.

## `saveTemplate(input)` — builder "Save template" (ref 06)

```text
saveTemplate(input: {
  name: string;
  prompt: string;
  triggerType: 'manual_link';            // only the LIVE trigger is accepted this slice
  deliveryChannel: 'email' | 'link';
  sendTiming?: string | null;
  consentLine: string;                   // verbatim (P-VII)
  consentVersion: string;
}): Promise<{ status: 'ok'; templateId: string }
          | { status: 'invalid'; reason: string }>
```

- Inserts a `request_template` for the current workspace.
- **Rejects** any `triggerType` other than `manual_link` with `invalid` (automated triggers are
  honest "coming" in the UI and must never persist as wired — D5).
- `revalidatePath('/app/requests')`.

## `createAndSendRequest(input)` — the loop-closer (ref 23 modal + ref 06 Manual-link create) (D3)

```text
createAndSendRequest(input: {
  channel: 'email' | 'link';
  recipientEmail?: string;               // required + validated when channel='email'
  customerName?: string | null;          // prefill from proof (ref 23) or builder
  templateId?: string | null;            // set when created from a template (powers N sent)
  message?: string | null;               // ref 23 editable note (verbatim)
}): Promise<
  | { status: 'ok'; channel: 'link'; captureUrl: string }                       // link generated
  | { status: 'ok'; channel: 'email'; captureUrl: string; delivery: 'accepted' } // emailed
  | { status: 'sent_failed'; captureUrl: string }   // request minted, email failed — link usable
  | { status: 'invalid'; reason: string }
>
```

Order (mint durable, send best-effort — never falsely "sent"):
1. Resolve current workspace + its `link` source. If `channel='email'`, validate `recipientEmail`
   (non-empty, basic email shape) → `invalid` on failure (no mint).
2. `createCaptureRequest(workspaceId, linkSourceId, { customerName, customerEmail: recipientEmail })`
   → `{ token }`. Build `captureUrl` from the app origin + `/c/${token}`.
3. Insert a `request_send` row (`requestId`, `templateId?`, `workspaceId`, `channel`,
   `recipientEmail?`).
4. **Link** → set `deliveryStatus='link_generated'`; return `{ ok, channel:'link', captureUrl }`.
5. **Email** → call `sendCaptureRequestEmail`. On `ok` → `deliveryStatus='accepted'` (+ providerId),
   return `{ ok, channel:'email', delivery:'accepted' }`. On failure → `deliveryStatus='failed'`,
   return `{ status:'sent_failed', captureUrl }` (the merchant can copy the link or retry).
6. `revalidatePath('/app/requests')` (and the proof page for ref 23).

Guarantees: **no proof/consent is written here** (that happens at capture); the mint reuses the T7.2
primitive with only the additive `customerEmail`; **zero** change to token generation/expiry/resolution.

## `listRequestTemplates()` — ref 05 read (server)

```text
listRequestTemplates(): Promise<TemplateCardView[]>   // workspace-scoped
// each: { id, name, prompt, triggerType, deliveryChannel, sentCount }
// sentCount = count(request_send WHERE template_id = id)  — real, owned (P-XIV)
```

## Honest-state matrix (what the UI may show — C5/P-XIV)

| Situation | Shown |
|---|---|
| Link generated | "Link ready" + copyable URL |
| Email accepted by Resend | "Sent" (+ optional "delivered" hint from `accepted`) |
| Email failed | honest "couldn't send — copy the link or retry"; never "sent" |
| Customer submitted | request "used" (T7.2 consume) |
| Past 72h | "expired" |
| Opens / clicks | **never shown** (not stored) |
