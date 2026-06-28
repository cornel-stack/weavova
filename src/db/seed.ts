import { getDb } from "./client.ts";
import {
  brandAsset,
  brandKit,
  consent,
  derivedAsset,
  membership,
  proof,
  proofBrandAsset,
  source,
  users,
  workspace,
  type SourceKind,
} from "./schema.ts";
import { SAMPLE_CLIP_URL } from "../lib/clip.ts";
import { resolveDisplay } from "../lib/consent.ts";

type ProofType = "text" | "video" | "photo" | "audio";
type ConsentState = "granted" | "awaiting" | "revoked";

type ConsentVersion = {
  state: ConsentState;
  version: number;
  grantedAt?: Date;
  revokedAt?: Date;
};

type Fixture = {
  customerName: string;
  sourceKind: SourceKind;
  proofType: ProofType;
  quote: string | null;
  transcript: string | null;
  capturedAt: string; // ISO
  reviewed: boolean;
  verified: boolean;
  consent: ConsentVersion[];
};

const SOURCES: { kind: SourceKind; label: string }[] = [
  { kind: "shopify", label: "Shopify" },
  { kind: "stripe", label: "Stripe" },
  { kind: "instagram", label: "Instagram" },
  { kind: "calendly", label: "Calendly" },
  { kind: "square", label: "Square" },
];

const granted = (at: string): ConsentVersion[] => [
  { state: "granted", version: 1, grantedAt: new Date(at) },
];
const awaiting = (): ConsentVersion[] => [{ state: "awaiting", version: 1 }];
const revoked = (grantedAt: string, revokedAt: string): ConsentVersion[] => [
  { state: "granted", version: 1, grantedAt: new Date(grantedAt) },
  {
    state: "revoked",
    version: 2,
    grantedAt: new Date(grantedAt),
    revokedAt: new Date(revokedAt),
  },
];

// Demo fixture dates are RELATIVE to seed-time now() (A-10) so the dashboard /
// inbox demo stays alive across reseeds instead of ageing out of the KPI
// windows: the newest proof is ~hours old, the rest spread back across the last
// ~30 days, and several land inside the last 7 — so BOTH the "this week" and
// "this month" windows are populated whenever the seed runs. `now` is captured
// once at seed runtime; re-running re-anchors every date to the new now().
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = new Date();
// ISO string for `days` (+ optional `hours`) before seed-time now.
const ago = (days: number, hours = 0): string =>
  new Date(NOW.getTime() - days * DAY - hours * HOUR).toISOString();

// 15 realistic, on-brand fixtures (no lorem; no real identifiable people;
// neutral placeholders for media). Unchanged mix — all four proof types
// (text 4 / video 4 / photo 4 / audio 3) and all three consent states
// (granted 10 / awaiting 4 / revoked 1), including one granted→revoked. Only the
// capture dates changed (now relative — see `ago`); consent timestamps stay
// chronologically coherent: granted at capture, and the revoked one is revoked
// after it was granted and before now.
const FIXTURES: Fixture[] = [
  // text
  { customerName: "Darnell W.", sourceKind: "stripe", proofType: "text", quote: "The monthly box is the only subscription I never even think about cancelling.", transcript: null, capturedAt: ago(11), reviewed: true, verified: true, consent: granted(ago(11)) },
  { customerName: "Priya R.", sourceKind: "calendly", proofType: "text", quote: "Booked the workshop for date night and we're honestly still talking about it.", transcript: null, capturedAt: ago(5), reviewed: false, verified: false, consent: granted(ago(5)) },
  { customerName: "Tom B.", sourceKind: "square", proofType: "text", quote: "Picked it up at the market stall as a gift and ended up keeping it for myself.", transcript: null, capturedAt: ago(9), reviewed: false, verified: false, consent: awaiting() },
  { customerName: "Leo M.", sourceKind: "instagram", proofType: "text", quote: "I almost bought a cheaper one. So glad I didn't — it's still going strong months later.", transcript: null, capturedAt: ago(17), reviewed: true, verified: false, consent: revoked(ago(17), ago(6)) },
  // video
  { customerName: "Maria L.", sourceKind: "shopify", proofType: "video", quote: null, transcript: "My whole flat smells like a spa now — I've already repurchased three times.", capturedAt: ago(0, 4), reviewed: false, verified: true, consent: granted(ago(0, 4)) },
  { customerName: "Aisha K.", sourceKind: "instagram", proofType: "video", quote: null, transcript: "Everyone who walks into my place asks what that smell is. Every single time.", capturedAt: ago(1), reviewed: true, verified: true, consent: granted(ago(1)) },
  { customerName: "Sofia D.", sourceKind: "shopify", proofType: "video", quote: null, transcript: "I gave one to my mum and now she texts me every week asking for more.", capturedAt: ago(8), reviewed: false, verified: false, consent: awaiting() },
  { customerName: "Marcus T.", sourceKind: "stripe", proofType: "video", quote: null, transcript: "Lit it during a rough week and it genuinely made the evenings feel calmer.", capturedAt: ago(13), reviewed: true, verified: false, consent: granted(ago(13)) },
  // photo
  { customerName: "Hannah P.", sourceKind: "square", proofType: "photo", quote: null, transcript: "Set it up on the windowsill and the whole corner finally feels like mine.", capturedAt: ago(2), reviewed: false, verified: true, consent: granted(ago(2)) },
  { customerName: "Diego R.", sourceKind: "shopify", proofType: "photo", quote: null, transcript: "Unboxed it on the kitchen table — the packaging alone got a photo.", capturedAt: ago(19), reviewed: false, verified: false, consent: awaiting() },
  { customerName: "Yuki N.", sourceKind: "instagram", proofType: "photo", quote: null, transcript: "Three of them on the shelf now. Might be a problem. A good problem.", capturedAt: ago(6), reviewed: true, verified: false, consent: granted(ago(6)) },
  { customerName: "Caleb W.", sourceKind: "square", proofType: "photo", quote: null, transcript: "Bought it for the scent, stayed for how the whole room looks now.", capturedAt: ago(24), reviewed: false, verified: false, consent: granted(ago(24)) },
  // audio
  { customerName: "Greta S.", sourceKind: "calendly", proofType: "audio", quote: null, transcript: "Honestly the calmest, happiest evening I've had in months. I'm already booking the next one.", capturedAt: ago(4), reviewed: false, verified: true, consent: granted(ago(4)) },
  { customerName: "Owen B.", sourceKind: "stripe", proofType: "audio", quote: null, transcript: "Left this as a quick voice note because typing wouldn't do it justice — it's that good.", capturedAt: ago(22), reviewed: false, verified: false, consent: awaiting() },
  { customerName: "Nadia F.", sourceKind: "shopify", proofType: "audio", quote: null, transcript: "My partner keeps stealing them for his office. I've started hiding a spare.", capturedAt: ago(28), reviewed: true, verified: false, consent: granted(ago(28)) },
];

const CAPTURE_CONTEXT = {
  method: "capture_page",
  locale: "en-GB",
  consentCopyVersion: "2026-05",
};

// Stubbed render (CLAUDE.md §3): every generated clip points at the SAME pre-made
// sample clip in R2 — an honest stand-in for the real per-proof render (T8), never
// a fabricated personalized render (FR-019). `SAMPLE_CLIP_URL` is imported from
// the shared module (T2.4b — D5): the seed and the studio write the same URL.

// Seeded derived assets (clips), T2.4a. Each is made under a proof's GRANTED consent
// version. The cascade is demonstrated in static data (Q3→A): the Leo M. clip was
// made during his granted window (under v1), but his effective consent is now revoked
// (v2) → it is WITHDRAWN at read time (absent from the dashboard count, latest clip,
// and his detail) while its row is retained for audit. The active clips (granted
// proofs) are counted + shown. Dates are relative (A-10) so "this month" stays alive.
type ClipFixture = {
  customerName: string; // the source proof
  consentVersion: number; // the granted consent version the clip was made under
  format: "9x16" | "1x1" | "4x5" | "16x9";
  hook: string; // brand-authored hook provenance
  createdAt: string; // ISO (relative)
};
const CLIPS: ClipFixture[] = [
  // active — under currently-granted proofs (counted + shown)
  { customerName: "Maria L.", consentVersion: 1, format: "9x16", hook: "Three times and counting.", createdAt: ago(2) },
  { customerName: "Aisha K.", consentVersion: 1, format: "9x16", hook: "What's that smell? (the good kind)", createdAt: ago(3) },
  { customerName: "Greta S.", consentVersion: 1, format: "9x16", hook: "The calmest evening in months.", createdAt: ago(5) },
  // born-then-withdrawn — under Leo M. (granted ago(17) → revoked ago(6)); made at
  // ago(10), inside the granted window, under v1. Now withdrawn (effective = revoked).
  { customerName: "Leo M.", consentVersion: 1, format: "9x16", hook: "Still going strong months later.", createdAt: ago(10) },
];

// Brand assets (T4-B2) — the brand's OWN footage in the reusable store. These are
// NOT customer proof: they sit OUTSIDE the consent model and are never counted as
// proof (FR-019). `assetUrl` is an HONEST PLACEHOLDER (a distinct r2:// namespace,
// NOT SAMPLE_CLIP_URL) — rendered everywhere as a metadata card, never a video /
// thumbnail (A-11). Real objects arrive via the live presigned-PUT upload.
type BrandAssetFixture = {
  kind: "product" | "broll";
  label: string;
  assetUrl: string;
  createdAt: string; // ISO (relative)
};
const BRAND_ASSETS: BrandAssetFixture[] = [
  { kind: "product", label: "Candle pour — close up", assetUrl: "r2://weavova-brand-assets/sample-candle-pour.mp4", createdAt: ago(7) },
  { kind: "broll", label: "Studio shelves — slow pan", assetUrl: "r2://weavova-brand-assets/sample-studio-shelves.mp4", createdAt: ago(12) },
  { kind: "product", label: "Gift set — unboxing", assetUrl: "r2://weavova-brand-assets/sample-gift-unboxing.mp4", createdAt: ago(20) },
];

// A couple of attachments (many-to-many): owned footage attached to GRANTED proofs
// as supporting context. The attach NEVER touches consent (P-VII); a withdrawn
// proof still can't generate a clip, asset attached or not. (label → proof customer)
type AttachmentFixture = { assetLabel: string; customerName: string };
const ATTACHMENTS: AttachmentFixture[] = [
  { assetLabel: "Candle pour — close up", customerName: "Maria L." },
  { assetLabel: "Studio shelves — slow pan", customerName: "Maria L." },
  { assetLabel: "Candle pour — close up", customerName: "Aisha K." },
];

async function seed() {
  const db = getDb();

  // Reset (FK-safe order) so the seed is re-runnable. The join + derived_asset
  // first (they reference proof/brand_asset/consent/workspace), then brand_asset
  // (before workspace), then the rest. T6: membership before workspace (it FKs
  // workspace). We do NOT delete `users`/`account`/`session` — real auth identities
  // are preserved across reseeds; only the demo membership is re-pointed below.
  await db.delete(derivedAsset);
  await db.delete(proofBrandAsset);
  await db.delete(brandKit);
  await db.delete(consent);
  await db.delete(proof);
  await db.delete(brandAsset);
  await db.delete(membership);
  await db.delete(source);
  await db.delete(workspace);

  // T7.1 — the workspace display DEFAULT new captures (T7.2) inherit: first-initial
  // naming, face shown. Privacy-forward but usable; a customer override may only move
  // MORE private than this (resolveDisplay). Distinct from the migration backfill of
  // EXISTING rows (full) — that preserves legacy verbatim presentation; this is the new
  // default for fresh data.
  const WS_DISPLAY_DEFAULT = { nameDisplay: "first_initial", showFace: true } as const;
  const [ws] = await db
    .insert(workspace)
    .values({
      name: "Lumen Candle Co.",
      slug: "lumen",
      defaultNameDisplay: WS_DISPLAY_DEFAULT.nameDisplay,
      defaultShowFace: WS_DISPLAY_DEFAULT.showFace,
    })
    .returning({ id: workspace.id });

  // T6 (C1=A) — the demo workspace OWNER. The LOGIN email is SEED_OWNER_EMAIL (the
  // mailbox Cornel controls, so the magic-link / Google flows actually reach the demo
  // workspace), but the DISPLAY identity stays "Maya K." so the chrome reads as the
  // demo persona — login email and display identity are deliberately separate.
  // Idempotent: upsert the user by email (preserved across reseeds / re-asserts the
  // name); the membership re-points to the fresh workspace each reseed. NO content
  // backfill — proof/clip/etc. already carry workspaceId.
  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? "amalacornel@gmail.com";
  const [demoUser] = await db
    .insert(users)
    .values({ name: "Maya K.", email: ownerEmail })
    .onConflictDoUpdate({ target: users.email, set: { name: "Maya K." } })
    .returning({ id: users.id });
  await db
    .insert(membership)
    .values({ userId: demoUser.id, workspaceId: ws.id, role: "owner" })
    .onConflictDoNothing();

  const sourceIdByKind = new Map<SourceKind, string>();
  for (const s of SOURCES) {
    const [row] = await db
      .insert(source)
      .values({ workspaceId: ws.id, kind: s.kind, label: s.label })
      .returning({ id: source.id });
    sourceIdByKind.set(s.kind, row.id);
  }

  // Capture ids so derived assets can reference the proof + the granted consent
  // version they were made under.
  const proofIdByCustomer = new Map<string, string>();
  const consentIdByProofVersion = new Map<string, string>(); // `${proofId}:${version}`

  let proofCount = 0;
  let consentCount = 0;
  for (const f of FIXTURES) {
    const [row] = await db
      .insert(proof)
      .values({
        workspaceId: ws.id,
        customerName: f.customerName,
        proofType: f.proofType,
        quote: f.quote,
        transcript: f.transcript,
        sourceId: sourceIdByKind.get(f.sourceKind)!,
        capturedAt: new Date(f.capturedAt),
        reviewed: f.reviewed,
        verified: f.verified,
        thumbnail: null,
      })
      .returning({ id: proof.id });
    proofIdByCustomer.set(f.customerName, row.id);
    proofCount += 1;

    for (const c of f.consent) {
      // T7.1 — the ConsentDisplay payload. GRANTED versions get FULL scope (honest
      // full-trust demo coherence — the prior "usable everywhere" meaning, P-XIV);
      // non-granted (awaiting/revoked) versions grant NOTHING ('{}'). Display is routed
      // through resolveDisplay (the SOLE sanctioned write path) against the workspace
      // default with NO override → the default itself; nothing here is set less private
      // than the workspace default.
      const display = resolveDisplay(WS_DISPLAY_DEFAULT);
      const [crow] = await db
        .insert(consent)
        .values({
          proofId: row.id,
          state: c.state,
          grantedAt: c.grantedAt ?? null,
          revokedAt: c.revokedAt ?? null,
          version: c.version,
          captureContext: CAPTURE_CONTEXT,
          useScope:
            c.state === "granted"
              ? ["organic", "paid", "showcase", "embed"]
              : [],
          nameDisplay: display.nameDisplay,
          showFace: display.showFace,
        })
        .returning({ id: consent.id });
      consentIdByProofVersion.set(`${row.id}:${c.version}`, crow.id);
      consentCount += 1;
    }
  }

  // Derived assets (clips). Each references its source proof and the GRANTED consent
  // version it was made under (provenance). The Leo M. clip is now withdrawn at read
  // time because his effective consent is revoked (P-VII) — the row is retained.
  let clipCount = 0;
  for (const clip of CLIPS) {
    const proofId = proofIdByCustomer.get(clip.customerName)!;
    const consentId = consentIdByProofVersion.get(
      `${proofId}:${clip.consentVersion}`,
    )!;
    await db.insert(derivedAsset).values({
      workspaceId: ws.id,
      proofId,
      consentId,
      kind: "clip",
      format: clip.format,
      assetUrl: SAMPLE_CLIP_URL,
      hook: clip.hook,
      createdAt: new Date(clip.createdAt),
    });
    clipCount += 1;
  }

  // Brand assets (owned footage) + the many-to-many attachments (T4-B2). Owned,
  // never proof; the attach is consent-free.
  const brandAssetIdByLabel = new Map<string, string>();
  let brandAssetCount = 0;
  for (const a of BRAND_ASSETS) {
    const [row] = await db
      .insert(brandAsset)
      .values({
        workspaceId: ws.id,
        kind: a.kind,
        label: a.label,
        assetUrl: a.assetUrl,
        createdAt: new Date(a.createdAt),
      })
      .returning({ id: brandAsset.id });
    brandAssetIdByLabel.set(a.label, row.id);
    brandAssetCount += 1;
  }

  let attachmentCount = 0;
  for (const att of ATTACHMENTS) {
    const proofId = proofIdByCustomer.get(att.customerName)!;
    const brandAssetId = brandAssetIdByLabel.get(att.assetLabel)!;
    await db.insert(proofBrandAsset).values({
      workspaceId: ws.id,
      proofId,
      brandAssetId,
    });
    attachmentCount += 1;
  }

  // The workspace's brand kit (T5-BrandKit) — seed real colours + fonts, and leave
  // logoAssetUrl NULL (the honest "no logo yet" state). We do NOT seed a placeholder
  // logo URL that would render broken; the logo is for live upload (FR-005).
  await db.insert(brandKit).values({
    workspaceId: ws.id,
    name: "Lumen Candle Co.",
    logoAssetUrl: null,
    brandColor: "#9A6A3C",
    fonts: { display: "fraunces", body: "hanken" },
  });

  console.log(
    `seeded: workspace=1 owner=${ownerEmail} (display "Maya K.") membership=1 sources=${SOURCES.length} proofs=${proofCount} consent=${consentCount} clips=${clipCount} brandAssets=${brandAssetCount} attachments=${attachmentCount} brandKit=1`,
  );
}

await seed();
