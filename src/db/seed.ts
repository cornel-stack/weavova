import { getDb } from "./client.ts";
import {
  consent,
  derivedAsset,
  proof,
  source,
  workspace,
  type SourceKind,
} from "./schema.ts";

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
// a fabricated personalized render (FR-019).
const SAMPLE_CLIP_URL = "r2://weavova-samples/press-run-sample.mp4";

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

async function seed() {
  const db = getDb();

  // Reset (FK-safe order) so the seed is re-runnable. derived_asset first (it
  // references proof/consent/workspace).
  await db.delete(derivedAsset);
  await db.delete(consent);
  await db.delete(proof);
  await db.delete(source);
  await db.delete(workspace);

  const [ws] = await db
    .insert(workspace)
    .values({ name: "Lumen Candle Co.", slug: "lumen" })
    .returning({ id: workspace.id });

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
      const [crow] = await db
        .insert(consent)
        .values({
          proofId: row.id,
          state: c.state,
          grantedAt: c.grantedAt ?? null,
          revokedAt: c.revokedAt ?? null,
          version: c.version,
          captureContext: CAPTURE_CONTEXT,
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

  console.log(
    `seeded: workspace=1 sources=${SOURCES.length} proofs=${proofCount} consent=${consentCount} clips=${clipCount}`,
  );
}

await seed();
