# Weavova — Render & Proof Spec

**Version:** 0.2 (open decisions resolved)
**Date:** June 2026
**Status:** Pre-build. Feeds the T7 (capture) and T8 (render engine) tiers. Derived from the Remotion spike + the render-flow analysis. The six v0.1 open decisions are now resolved — see §11.
**Relation to other docs:** Subordinate to `CLAUDE.md` and the constitution. This is the engineering spec for *how raw proof becomes post-ready content*. It is the source that the T7/T8 `/speckit.specify` documents will be written from.

---

## 0. Why this spec exists

The Remotion spike proved exactly one happy path: a single video + a clean, pre-written quote, rendered to a branded vertical clip. That path validated the engine, the brand system in motion, and the no-editor promise — but it quietly assumed away the real product. Real proof arrives in four formats, in any orientation, in any quality, in the customer's own voice and words, under a specific consent. A single template can neither handle that variety nor honour the authenticity rules.

This spec defines the real shape: a **segmented clip timeline**, a **template family keyed by proof type**, fed by a **pre-render pipeline**, gated by **consent + human approval**, and bound everywhere by one law.

---

## 1. The governing law

> **We never fabricate or alter the customer's testimony.**

No synthetic voice. No words put in the customer's mouth. No caption that misquotes them. No hook attributed to them that they didn't say. The instant we cross this line we *become* the synthetic AI-UGC we are counter-positioned against, and the "Verified real" stamp becomes fraud.

This is the operational expression of three constitution principles:

- **The One Law** (II) — the customer is the headline; our framing is clearly *ours*, never theirs.
- **Consent Is Sacred** (VII) — consent is scoped, revocable, and display-aware; revocation cascades.
- **No Editor** (VIII) — no video editor for the *user*. The system performs automated assembly; the human's only job is review and approval, never timeline editing.

Every requirement below traces back to this law.

---

## 2. Proof-type taxonomy → template families

The engine is not one composition. It is a **family** sharing the brand chrome (lockup, hook treatment, verified stamp, palette, type) but differing at the core, keyed by `proofType`.

| Proof type | Has voice? | Has face? | Core treatment | Notes |
|---|---|---|---|---|
| **video** | yes | yes | Full-bleed footage + synced captions of their real speech | Richest. The spike's validated baseline. |
| **audio** | yes | no | Audiogram: waveform + synced captions + product still | Real voice is gold; no face needed. |
| **photo** | no | maybe | Slow-push (Ken Burns) still or carousel slide + written quote | Quote is the verified words. |
| **text** | no | no | Typographic motion clip / carousel; the written words are the hero | **Never TTS into a fake spoken testimonial.** Show the real source artifact (review/DM screenshot) as proof. |

**Key consequence for text (the open question):** a text testimonial cannot "speak" without synthesis, which is forbidden. So text renders as *designed typography* — the verified words animated over brand ground, with attribution and, ideally, a screenshot of the real review as on-screen proof-of-realness. It is a different template, not the video template with a synthetic voice bolted on.

---

## 3. Clip structure — the hook → review → payoff timeline

A clip is a **timeline of segments**, not one static overlay (the spike's mistake was pinning a persistent hook over the whole video).

```
[ HOOK ]            [ REVIEW ]                         [ PAYOFF ]
0 – ~1.5s           the customer's real words/voice     last ~1.5–2s
brand framing       (face for video, audiogram for      verified stamp,
grabs attention     audio, typography for text/photo)   brand, soft CTA
```

- **Hook beat** — brand-authored framing that teases the payoff of the selected review. Editable by the merchant. Visually + semantically distinct from the customer's words so no viewer thinks the customer said it.
- **Review beat** — the sacred core. The customer's actual words, in their actual voice where one exists. Captions are their real transcript. This is the longest beat.
- **Payoff beat** — the verified stamp, attribution, brand mark, and an optional CTA ("see why" / link).

The hook persists as a *small* kicker during the review if desired, but does not dominate the frame the whole time (a craft fix from the spike: by 6s it was too text-heavy and crowded out the face, which is the proof).

---

## 4. The render contract (`RenderInput`)

The contract is a **discriminated union on `proofType`**. Shared fields live in the base; the core differs per type. This supersedes the spike's single flat props object.

```ts
type ProofType = "video" | "audio" | "photo" | "text";
type Format = "9x16" | "1x1" | "4x5" | "16x9";

interface Caption {            // word-level, corrected transcript
  word: string;
  startMs: number;
  endMs: number;
}

interface BrandKit {
  paper: string; card: string; ink: string; ink2: string;
  persimmon: string; persimmonDeep: string; onAccent: string; hairline: string;
  logoUrl?: string;
  fontDisplay: string;         // must be licensed + loadable; has a fallback
  fontBody: string;
}

interface ConsentDisplay {
  nameDisplay: "full" | "first_initial" | "anonymous";
  showFace: boolean;           // false → blur/avoid face framing
  useScope: ("organic" | "paid" | "showcase" | "embed")[];
}

interface Hook {
  text: string;                // BRAND-authored, never attributed to customer
  source: "brand";
}

interface Attribution {
  displayName: string;         // already resolved per ConsentDisplay
  verified: boolean;
  verificationBasis: string;   // e.g. "order #1234 + consent v2" — substantiates the stamp
}

interface Music {
  src: string;
  licenseId: string;           // must be a cleared, commercially-licensed track
  duckUnderSpeech: boolean;
}

interface RenderBase {
  proofType: ProofType;
  format: Format;
  hook: Hook;
  attribution: Attribution;
  brand: BrandKit;
  consent: ConsentDisplay;
  music?: Music;
}

interface VideoProof extends RenderBase {
  proofType: "video";
  sourceVideo: string;         // normalized (see pipeline)
  transcript: Caption[];       // their real words, corrected
  highlight: { startMs: number; endMs: number };
  reframe: "subject_track" | "letterbox";
}

interface AudioProof extends RenderBase {
  proofType: "audio";
  sourceAudio: string;
  transcript: Caption[];
  highlight: { startMs: number; endMs: number };
  poster?: string;             // product/customer still behind the audiogram
}

interface PhotoProof extends RenderBase {
  proofType: "photo";
  image: string;
  quote: string;               // the verified written words
}

interface TextProof extends RenderBase {
  proofType: "text";
  quote: string;               // the verified written words
  sourceArtifact?: string;     // screenshot of the real review/DM
}

type RenderInput = VideoProof | AudioProof | PhotoProof | TextProof;
```

Note what is *resolved before* render: `displayName` already reflects consent, `transcript` is already corrected, `highlight` is already chosen, `music.licenseId` is already cleared. The render stage is dumb and deterministic; all judgment happens upstream in the pipeline.

---

## 5. The pre-render pipeline

The render is the last stage. Everything that makes a clip *correct and consented* happens before it.

```
ingest → normalize → transcribe → correct → select highlight → reframe → assemble → APPROVE → render → distribute
```

1. **Ingest** — accept the raw proof (any format/orientation/quality) + the consent record. (T7)
2. **Normalize** — transcode the source to a sane resolution/codec/length before anything decodes it. *(Spike learning: the 4K/60fps original crashed the machine; a 720×1280 normalize fixed it. The real worker must do this for every upload.)*
3. **Transcribe** — for video/audio, word-level timestamps via AssemblyAI/Deepgram; detect language/accent.
4. **Correct** — mandatory human correction of the transcript before it can be used as captions (a wrong caption is a fabricated quote).
5. **Select highlight** — pick the punchy segment (merchant picks; we may suggest). The hook is written to tease *this* segment.
6. **Reframe** — subject-aware framing or branded letterbox (never blind-crop a face).
7. **Assemble** — build the `RenderInput` from the corrected, consented, resolved pieces.
8. **Approve** — human approval gate. Nothing auto-publishes.
9. **Render** — Remotion, deterministic, on the cloud worker.
10. **Distribute** — publish / export / embed, within consent scope.

---

## 6. Cross-cutting treatments

### 6.1 Captions & transcription accuracy
Captions are the customer's actual words, time-synced (karaoke that tracks their real speech). ASR errors misquote a real person, so the **correction step (5.4) is mandatory** — the transcript cannot reach render uncorrected. Language/accent detection runs at transcribe time and routes low-confidence transcripts to extra review.

### 6.2 Highlight selection
Raw testimonials are long and meandering; the clip must *lead with the payoff*. The merchant selects the strongest sentence (assisted by suggestions). Without this, clips open on throat-clearing and the hook has nothing to tease.

### 6.3 Reframing / orientation
Customers record vertical, landscape, and square. Blind cover-crop to 9:16 can cut the speaker's face off (we saw the spike cover-crop a landscape 4K). Two safe modes:
- `subject_track` — keep the face/subject centred.
- `letterbox` — place the landscape clip inside branded chrome (brand top/bottom) when reframing is risky.

### 6.4 Legibility over arbitrary footage
We don't control what's behind the text on the next customer's clip (the spike's hook washed out over a bright window). Contrast must be **adaptive**: stronger/auto-adjusting scrims, or a contrast-aware text backing, guaranteeing the hook and captions are readable over *any* footage. Design for **muted autoplay** — most feeds play silent, so hook + captions must carry the whole message without sound.

### 6.5 Audio & music
- **Preserve the real voice.** For video/audio, the customer's voice is the proof; keep it, clean noise only.
- **Duck music under speech.** Music lowers while they speak, rises in hook/payoff (the spike played music over silent footage — real footage has them talking).
- **License the music.** Only cleared, commercially-licensed tracks (`music.licenseId`); random tracks earn copyright strikes the moment a clip hits social.
- **Never synthesize a voice.** Text/photo proof gets no spoken VO.

### 6.6 Brand kit application
Each merchant's brand differs (the spike hardcoded Pressroom). Arbitrary brand kits bring:
- **Fonts** that must load + be licensed in Remotion, each with a fallback.
- **Logos** placed in safe areas.
- **Colours** that may fail contrast over footage → brand-kit values pass through **legibility guardrails**, not naive substitution.

### 6.7 Formats & muted autoplay
9:16 / 1:1 / 4:5 / 16:9 each **reflow** the layout (hook + captions repositioned), never a centre-crop of the 9:16 master. Each format produces a poster/cover frame whose first frame + first caption communicate without sound.

---

## 7. The trust layer

### 7.1 What "Verified real" asserts
The stamp is a factual claim: *this is a genuine customer*. **Resolved bar:** it requires (a) a **current, granted consent** and (b) a link to the **real transaction event** (order / booking / delivery) that capture fired on — both recorded in `attribution.verificationBasis`. Consent-only is insufficient (agreeing to share doesn't prove they bought); identity verification is out of scope for v1 (too heavy, privacy-fraught). If either leg is missing — no transaction link, or consent not currently granted — the stamp is **not shown**; the content may still be produced, just unstamped. This bar is the moat and is held firm while everything else flexes.

### 7.2 Consent scope, display, revocation
Consent is not a boolean. It carries **use-scope** (organic / paid / showcase / embed), **display preferences** (full name / first-initial / anonymous; face / no-face), and is **revocable**. On revocation:
- Pull derived assets (schema already cascades `derived_asset.consentId`).
- Stop further distribution.
- Flag already-posted clips for takedown (we can't un-post, so this needs an operational runbook, not just a DB cascade).

**Resolved runbook — two-tier.** Everything Weavova hosts (embeds, showcase, library, queued-but-unposted) is pulled **instantly and automatically** on revocation. Anything already posted to a third-party platform is **auto-flagged to the merchant as a takedown task with a deadline**, the obligation carried in the merchant terms. The consent UX sets this expectation up front ("external posts removed within X days"). We enforce exactly what we control and route what we don't, rather than promising a takedown we can't technically perform.

### 7.3 Human approval gate
Because every clip quotes a real person and makes a verified claim, **nothing auto-publishes**. The merchant reviews the generated clip, fixes transcript/hook, confirms consent + scope, then approves. The design-reference's "unreviewed" stamp on the ProofCard already gestures at this gate.

### 7.4 Hook provenance
The hook is the brand's marketing words, not the customer's. It is **visually and semantically separated** from the customer's quote/captions, is editable by the merchant, and is never rendered in a way that could read as something the customer said.

---

## 8. Spike learnings carried into T8

- **Normalize the source first** (resolution/codec/length) — required for every upload, not a one-off.
- **Render is memory-bound by source decode** — concurrency and source size are the levers; the cloud worker is sized for this, the local machine is not the renderer.
- **The `RenderInput` contract is real code** — it drives the studio UI fields and the schema's `derived_asset` shape.
- **The Pressroom brand system survives vertical video** — Fraunces/persimmon/paper/stamp read as premium and non-synthetic (validated baseline for the video template).
- **Craft fixes from the judged clip:** adaptive scrims (legibility), and easing text density so the face breathes.

---

## 9. Issue → resolution traceability

Every inconsistency we identified, and where this spec resolves it. (★ = raised by Cornel.)

| # | Issue | Resolved by |
|---|---|---|
| 1 ★ | Text proof has no voice/face — how to make it UGC | §2 (text template), §1 (no synthesis) |
| 2 ★ | Video needs a hook before the review, in the user's own voice | §3 (timeline), §6.5 (preserve voice) |
| 3 | Photo and audio proof need their own treatments | §2 (audiogram, Ken Burns) |
| 4 | Hook could be misread as the customer's words | §3, §7.4 (provenance separation) |
| 5 | Which segment of a long video is the "review" | §5.5, §6.2 (highlight selection) |
| 6 | Captions must be their real words, time-synced | §6.1 (transcription + timing) |
| 7 | Transcription errors fabricate quotes | §5.4 (mandatory correction gate) |
| 8 | Music buries the voice / is unlicensed | §6.5 (duck + license) |
| 9 | Cover-crop cuts faces | §6.3 (subject-track / letterbox) |
| 10 | Text washes out over bright footage | §6.4 (adaptive legibility) |
| 11 | Every brand kit differs (fonts/logo/colour) | §6.6 (kit + guardrails) |
| 12 | Formats must reflow, not crop; muted autoplay | §6.7 |
| 13 | "Verified real" is an unbacked claim | §7.1 (substantiation) |
| 14 | Consent is scoped, revocable, display-aware | §7.2 |
| 15 | Clips auto-publishing without review | §7.3 (approval gate) |

---

## 10. Build implications

- **T7 (Capture)** owns ingest, consent capture (scope + display), normalize, and verification basis. First real customer proof enters here.
- **T8 (Render engine)** owns transcribe → correct → select → reframe → assemble → render, the template family, and the approval gate. The spike's `ProofClip` becomes the **video** template; the audio/photo/text templates are built alongside.
- **Sequencing note:** the correction gate, approval gate, and consent-scope model are not polish — they are prerequisites for *any* clip to legitimately carry the verified stamp. They ship with T7/T8, not later.

---

## 11. Decisions (resolved — v0.2)

Confirmed by Cornel. These close the v0.1 open questions; cross-refs point to where each operates.

1. **Highlight selection → assisted-lite from day one.** Manual in/out control, but the in/out is **pre-seeded from a cheap transcript heuristic** (longest complete, high-sentiment sentence) so the merchant edits a guess rather than scrubbing from blank. Full LLM ranking is a fast-follow. Stored as start/end ms on the derived asset. (§5.5, §6.2)
2. **Hook authoring → suggested, merchant edits.** A library of brand-voice hook **patterns** + LLM-suggested fills drawn from the transcript, always editable, **never auto-final**, never rendered as the customer's quote. (§3, §7.4)
3. **Verified bar → consent + a linked real transaction.** Current granted consent **and** a link to the real order / booking / delivery event. Not consent-only; not identity verification. Missing either leg → no stamp. (§7.1)
4. **Text-proof format → motion clip by default, carousel alternate.** Default is a clip featuring the **real source screenshot** as proof; carousel is available; the choice is a **workspace default, overridable per proof** — not asked every time. (§2)
5. **Revocation → two-tier.** Hosted assets pulled instantly and automatically; already-posted external clips auto-flagged to the merchant as a takedown task with a deadline, obligation in the terms; expectation set in the consent UX. (§7.2)
6. **Transcription provider → deferred to T8; seam locked now.** Both AssemblyAI and Deepgram expose word-level timestamps; the pick (accuracy-for-our-languages — test Swahili / African-accented English — and cost/latency) is **benchmarked on real audio at T8**. The `transcript: Caption[]` interface is locked now so the provider stays swappable and the decision carries no urgency. (§6.1, §10)
