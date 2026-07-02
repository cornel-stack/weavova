# Contract — Edge surfaces (screen 09 camera-blocked · screen 10 expired link)

Both PORT the polished designed surface over the spine's existing minimal state. Verbatim copy,
mobile-first, Pressroom light + dark. No behavior change beyond the personalization/guidance below.

## Screen 09 — Camera blocked (binding: `09 _ Camera blocked`)

Shown when `getUserMedia` is unavailable/denied (the existing fallback seam). Verbatim:

> **No camera? No problem.**
> We couldn’t reach your camera. You can upload a clip from your gallery, or just write a few words
> instead.
> **[ Upload from gallery ]**  **[ Write it instead ]**
> powered by Weavova

- **Upload from gallery** → a file input → the media review → consent → send (a real path, no dead
  control).
- **Write it instead** → the text path.
- Replaces the spine's minimal fallback; same working behavior, designed UI.

## Screen 10 — Expired / used / not-found (binding: `10 _ Expired link`)

Ported over `block.tsx`. **Personalized** for expired/used (the token maps to a real workspace), generic
for not-found.

**Expired** (verbatim, `{Workspace}` filled):

> **This link has expired.**
> For your security, collection links only stay open for a little while. **{Workspace}** can send you a
> fresh one.
> Ask **{Workspace}** for a new link         ← honest guidance TEXT, not a button (D5)
> powered by Weavova

- **Used**: the honest used state (also personalized with `{Workspace}`); no re-submission.
- **Not-found**: **generic** — no workspace name (no row → nothing to personalize; no enumeration/leak).
- **"Ask {Workspace} for a new link"** is **non-interactive guidance** (P-XIII): no customer→merchant
  request channel exists, so it is never a control that silently does nothing.

## Wiring

- `getCaptureRequestByToken` returns `workspaceName` on `used`/`expired` (the join already fetches
  `workspace.name`); `not_found` stays bare.
- `page.tsx` passes `workspaceName` to `CaptureBlock`; the block renders the personalized copy for
  expired/used and generic for not-found.

## Guarantees

| Guarantee | Mechanism | Ref |
|---|---|---|
| Camera-blocked never dead-ends | 09 upload + write paths both real | FR-010 · P-XIII |
| Expired/used personalized, not-found generic | resolver `workspaceName` on used/expired only | FR-011 · D4 |
| No workspace leak on unknown token | not_found carries no row/name | FR-011 |
| "Ask" is honest, not fake | rendered as guidance text | FR-011 · D5 |
| Verbatim copy, light+dark, mobile-first | port from binding refs | FR-012 · P-V |
