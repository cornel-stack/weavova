// T7.2b Increment-1 headless verification — the photo/audio DATA SHAPE via the REAL (frozen)
// write path (writeCapturedProof), + the additive allowlist. Uses a throwaway workspace
// (slug "t72b-verify-…"), asserts, then deletes it (cascade). Never touches Lumen/seed data.
// Run: node --env-file=.env.local --import tsx scripts/t72b-verify.mts
import { eq, like } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { workspace, source, captureRequest, proof, consent } from "../src/db/schema";
import { writeCapturedProof } from "../src/db/queries";
import {
  CAPTURE_ALLOWED_IMAGE_TYPES,
  CAPTURE_ALLOWED_AUDIO_TYPES,
  CAPTURE_ALLOWED_VIDEO_TYPES,
} from "../src/lib/capture";

const db = getDb();
const MARK = "t72b-verify-";
let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "  ✓ PASS" : "  ✗ FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (ok) pass++;
  else fail++;
}

// Replicate the allowlist predicate (it's module-private in actions.ts) to assert coverage.
const allowed = new Set<string>([
  ...CAPTURE_ALLOWED_VIDEO_TYPES,
  ...CAPTURE_ALLOWED_IMAGE_TYPES,
  ...CAPTURE_ALLOWED_AUDIO_TYPES,
]);

async function cleanup() {
  const wss = await db.select({ id: workspace.id }).from(workspace).where(like(workspace.slug, `${MARK}%`));
  for (const w of wss) await db.delete(workspace).where(eq(workspace.id, w.id)); // cascades
}

async function main() {
  await cleanup();

  // ── Allowlist coverage (T002/T003) ──
  console.log("[allowlist] additive image + audio, video unchanged");
  check("image/jpeg + image/heic accepted", allowed.has("image/jpeg") && allowed.has("image/heic"));
  check("audio/webm + audio/mp4 accepted", allowed.has("audio/webm") && allowed.has("audio/mp4"));
  check("video types still accepted", allowed.has("video/webm") && allowed.has("video/mp4"));
  check("junk type rejected", !allowed.has("application/x-msdownload"));

  // ── Throwaway chain: workspace → source → open capture_request ──
  const [ws] = await db.insert(workspace).values({ name: "T72b Verify Co.", slug: `${MARK}${Date.now?.() ?? "x"}` } as never).returning({ id: workspace.id });
  const [src] = await db.insert(source).values({ workspaceId: ws.id, kind: "link", label: "verify" } as never).returning({ id: source.id });
  const future = new Date(Date.now?.() ?? 0);
  future.setHours(future.getHours() + 72);
  const [req] = await db.insert(captureRequest).values({ workspaceId: ws.id, sourceId: src.id, token: `${MARK}tok-${Date.now?.() ?? "x"}`, status: "open", expiresAt: future } as never).returning({ id: captureRequest.id });

  const display = { nameDisplay: "first_initial", showFace: true } as const;

  async function assertMediaProof(kind: "photo" | "audio", key: string) {
    console.log(`\n[${kind}] real write path (writeCapturedProof)`);
    const { proofId } = await writeCapturedProof({
      workspaceId: ws.id,
      sourceId: src.id,
      requestId: req.id,
      customerName: "A customer",
      proofType: kind,
      quote: null,
      transcript: null,
      mediaUrl: key,
      display,
    });
    const [p] = await db.select().from(proof).where(eq(proof.id, proofId));
    check(`${kind}: proof_type = '${kind}'`, p.proofType === kind, p.proofType);
    check(`${kind}: mediaUrl is the private-bucket KEY (not an http URL)`, p.mediaUrl === key && !/^https?:\/\//.test(p.mediaUrl ?? ""), p.mediaUrl ?? "null");
    check(`${kind}: media_status = 'captured'`, p.mediaStatus === "captured", String(p.mediaStatus));
    const [c] = await db.select().from(consent).where(eq(consent.proofId, proofId));
    check(`${kind}: consent granted + organic scope`, c?.state === "granted" && (c?.useScope as string[])?.includes("organic"), `${c?.state} / ${JSON.stringify(c?.useScope)}`);
  }

  await assertMediaProof("photo", "captures/verify/photo-abc.jpg");
  await assertMediaProof("audio", "captures/verify/audio-xyz.weba");

  await cleanup();
  console.log(`\n=== T7.2b Increment-1 headless verification: ${pass} passed, ${fail} failed ===`);
  if (fail > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error("harness error:", e);
  try { await cleanup(); } catch {}
  process.exit(1);
});
