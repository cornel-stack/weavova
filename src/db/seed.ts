import { getDb } from "./client.ts";
import {
  consent,
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

// ~15 realistic, on-brand fixtures (no lorem; no real identifiable people;
// neutral placeholders for media). All four proof types, all three consent
// states, including one granted→revoked.
const FIXTURES: Fixture[] = [
  // text
  { customerName: "Darnell W.", sourceKind: "stripe", proofType: "text", quote: "The monthly box is the only subscription I never even think about cancelling.", transcript: null, capturedAt: "2026-05-12", reviewed: true, verified: true, consent: granted("2026-05-12") },
  { customerName: "Priya R.", sourceKind: "calendly", proofType: "text", quote: "Booked the workshop for date night and we're honestly still talking about it.", transcript: null, capturedAt: "2026-05-19", reviewed: false, verified: false, consent: granted("2026-05-19") },
  { customerName: "Tom B.", sourceKind: "square", proofType: "text", quote: "Picked it up at the market stall as a gift and ended up keeping it for myself.", transcript: null, capturedAt: "2026-05-22", reviewed: false, verified: false, consent: awaiting() },
  { customerName: "Leo M.", sourceKind: "instagram", proofType: "text", quote: "I almost bought a cheaper one. So glad I didn't — it's still going strong months later.", transcript: null, capturedAt: "2026-04-30", reviewed: true, verified: false, consent: revoked("2026-04-30", "2026-05-15") },
  // video
  { customerName: "Maria L.", sourceKind: "shopify", proofType: "video", quote: null, transcript: "My whole flat smells like a spa now — I've already repurchased three times.", capturedAt: "2026-06-01", reviewed: false, verified: true, consent: granted("2026-06-01") },
  { customerName: "Aisha K.", sourceKind: "instagram", proofType: "video", quote: null, transcript: "Everyone who walks into my place asks what that smell is. Every single time.", capturedAt: "2026-06-02", reviewed: true, verified: true, consent: granted("2026-06-02") },
  { customerName: "Sofia D.", sourceKind: "shopify", proofType: "video", quote: null, transcript: "I gave one to my mum and now she texts me every week asking for more.", capturedAt: "2026-05-27", reviewed: false, verified: false, consent: awaiting() },
  { customerName: "Marcus T.", sourceKind: "stripe", proofType: "video", quote: null, transcript: "Lit it during a rough week and it genuinely made the evenings feel calmer.", capturedAt: "2026-05-30", reviewed: true, verified: false, consent: granted("2026-05-30") },
  // photo
  { customerName: "Hannah P.", sourceKind: "square", proofType: "photo", quote: null, transcript: "Set it up on the windowsill and the whole corner finally feels like mine.", capturedAt: "2026-06-03", reviewed: false, verified: true, consent: granted("2026-06-03") },
  { customerName: "Diego R.", sourceKind: "shopify", proofType: "photo", quote: null, transcript: "Unboxed it on the kitchen table — the packaging alone got a photo.", capturedAt: "2026-05-24", reviewed: false, verified: false, consent: awaiting() },
  { customerName: "Yuki N.", sourceKind: "instagram", proofType: "photo", quote: null, transcript: "Three of them on the shelf now. Might be a problem. A good problem.", capturedAt: "2026-06-04", reviewed: true, verified: false, consent: granted("2026-06-04") },
  { customerName: "Caleb W.", sourceKind: "square", proofType: "photo", quote: null, transcript: "Bought it for the scent, stayed for how the whole room looks now.", capturedAt: "2026-05-18", reviewed: false, verified: false, consent: granted("2026-05-18") },
  // audio
  { customerName: "Greta S.", sourceKind: "calendly", proofType: "audio", quote: null, transcript: "Honestly the calmest, happiest evening I've had in months. I'm already booking the next one.", capturedAt: "2026-06-05", reviewed: false, verified: true, consent: granted("2026-06-05") },
  { customerName: "Owen B.", sourceKind: "stripe", proofType: "audio", quote: null, transcript: "Left this as a quick voice note because typing wouldn't do it justice — it's that good.", capturedAt: "2026-05-26", reviewed: false, verified: false, consent: awaiting() },
  { customerName: "Nadia F.", sourceKind: "shopify", proofType: "audio", quote: null, transcript: "My partner keeps stealing them for his office. I've started hiding a spare.", capturedAt: "2026-05-21", reviewed: true, verified: false, consent: granted("2026-05-21") },
];

const CAPTURE_CONTEXT = {
  method: "capture_page",
  locale: "en-GB",
  consentCopyVersion: "2026-05",
};

async function seed() {
  const db = getDb();

  // Reset (FK-safe order) so the seed is re-runnable.
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
    proofCount += 1;

    for (const c of f.consent) {
      await db.insert(consent).values({
        proofId: row.id,
        state: c.state,
        grantedAt: c.grantedAt ?? null,
        revokedAt: c.revokedAt ?? null,
        version: c.version,
        captureContext: CAPTURE_CONTEXT,
      });
      consentCount += 1;
    }
  }

  console.log(
    `seeded: workspace=1 sources=${SOURCES.length} proofs=${proofCount} consent=${consentCount}`,
  );
}

await seed();
