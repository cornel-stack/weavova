// T7.2b Increment-2 headless verification — the resolver personalization (T012): expired/used
// carry the workspace NAME, not-found stays bare. Throwaway rows, cleaned up. Never touches Lumen.
// Run: node --env-file=.env.local --import tsx scripts/t72b-inc2-verify.mts
import { eq, like } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { workspace, source, captureRequest } from "../src/db/schema";
import { getCaptureRequestByToken } from "../src/db/queries";

const db = getDb();
const MARK = "t72b-i2-";
let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "  ✓ PASS" : "  ✗ FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (ok) pass++;
  else fail++;
}

async function cleanup() {
  const wss = await db.select({ id: workspace.id }).from(workspace).where(like(workspace.slug, `${MARK}%`));
  for (const w of wss) await db.delete(workspace).where(eq(workspace.id, w.id)); // cascade
}

async function main() {
  await cleanup();
  const wsName = "Aurelia Studio";
  const [ws] = await db.insert(workspace).values({ name: wsName, slug: `${MARK}${Date.now?.() ?? "x"}` } as never).returning({ id: workspace.id });
  const [src] = await db.insert(source).values({ workspaceId: ws.id, kind: "link", label: "verify" } as never).returning({ id: source.id });

  const past = new Date(Date.now?.() ?? 0); past.setHours(past.getHours() - 1);
  const future = new Date(Date.now?.() ?? 0); future.setHours(future.getHours() + 72);

  const expiredTok = `${MARK}expired-${Date.now?.() ?? "x"}`;
  const usedTok = `${MARK}used-${Date.now?.() ?? "x"}`;
  await db.insert(captureRequest).values({ workspaceId: ws.id, sourceId: src.id, token: expiredTok, status: "open", expiresAt: past } as never);
  await db.insert(captureRequest).values({ workspaceId: ws.id, sourceId: src.id, token: usedTok, status: "used", expiresAt: future } as never);

  const expired = await getCaptureRequestByToken(expiredTok);
  check("expired → status 'expired' + workspaceName present", expired.status === "expired" && "workspaceName" in expired && expired.workspaceName === wsName, JSON.stringify(expired));

  const used = await getCaptureRequestByToken(usedTok);
  check("used → status 'used' + workspaceName present", used.status === "used" && "workspaceName" in used && used.workspaceName === wsName, JSON.stringify(used));

  const notFound = await getCaptureRequestByToken(`${MARK}nonexistent-token`);
  check("not_found → status 'not_found', NO workspaceName (generic, no leak)", notFound.status === "not_found" && !("workspaceName" in notFound), JSON.stringify(notFound));

  await cleanup();
  console.log(`\n=== T7.2b Increment-2 headless verification: ${pass} passed, ${fail} failed ===`);
  if (fail > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error("harness error:", e);
  try { await cleanup(); } catch {}
  process.exit(1);
});
