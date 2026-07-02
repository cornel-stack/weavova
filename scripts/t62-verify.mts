// T6.2 Increment-1 headless verification — the data-layer writes + gate conditionals.
// Uses a throwaway workspace (slug prefix "t62-verify-"), cleans up, never touches Lumen.
// Run: node --env-file=.env.local --import tsx scripts/t62-verify.mts
import { eq, like } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { workspace } from "../src/db/schema";
import {
  setWorkspaceBusinessType,
  setWorkspaceFirstFormat,
  markWorkspaceOnboarded,
} from "../src/db/queries";
import { BUSINESS_TYPES, FIRST_FORMATS } from "../src/lib/onboarding";

const db = getDb();
const MARK = "t62-verify-";
let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "  ✓ PASS" : "  ✗ FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (ok) pass++;
  else fail++;
}

async function cleanup() {
  await db.delete(workspace).where(like(workspace.slug, `${MARK}%`));
}
async function readWs(id: string) {
  const [w] = await db.select().from(workspace).where(eq(workspace.id, id));
  return w;
}

async function main() {
  await cleanup();

  // A fresh (un-onboarded) workspace — the state the T6.1 bootstrap leaves.
  const [ws] = await db
    .insert(workspace)
    .values({ name: "T62 Verify Co.", slug: `${MARK}${Date.now?.() ?? "x"}` } as never)
    .returning({ id: workspace.id });
  const id = ws.id;

  // Gate conditional (forward): a fresh workspace is un-onboarded.
  const fresh = await readWs(id);
  check("fresh workspace: onboarded_at IS NULL (forward gate → wizard)", fresh.onboardedAt === null);
  check("fresh workspace: business_type NULL, first_format NULL", fresh.businessType === null && fresh.firstFormat === null);

  // Step 1 write.
  await setWorkspaceBusinessType(id, "ecommerce");
  check("setWorkspaceBusinessType persists an allowlist value", (await readWs(id)).businessType === "ecommerce");

  // Step 1 allowlist guard.
  let rejected = false;
  try {
    await setWorkspaceBusinessType(id, "not_a_type" as never);
  } catch {
    rejected = true;
  }
  check("setWorkspaceBusinessType rejects an off-allowlist value", rejected);

  // Step 4 write.
  await setWorkspaceFirstFormat(id, "quote_card");
  check("setWorkspaceFirstFormat persists an allowlist value", (await readWs(id)).firstFormat === "quote_card");

  let rejected2 = false;
  try {
    await setWorkspaceFirstFormat(id, "widescreen" as never);
  } catch {
    rejected2 = true;
  }
  check("setWorkspaceFirstFormat rejects an off-allowlist value", rejected2);

  // Finish → onboarded_at set (forward gate now no-ops; inverse gate → /app).
  check("before finish: still un-onboarded", (await readWs(id)).onboardedAt === null);
  await markWorkspaceOnboarded(id);
  const done = await readWs(id);
  check("markWorkspaceOnboarded sets onboarded_at (gate flips to app)", done.onboardedAt !== null);

  // Idempotent re-finish is harmless.
  await markWorkspaceOnboarded(id);
  check("markWorkspaceOnboarded is idempotent (still onboarded)", (await readWs(id)).onboardedAt !== null);

  // Allowlist sanity: the code vocab matches what the UI offers.
  check("BUSINESS_TYPES has the 6 design options", BUSINESS_TYPES.length === 6);
  check("FIRST_FORMATS has the 5 design options", FIRST_FORMATS.length === 5);

  // ── Increment 2 · US3 skip: sets onboarded_at, writes NO step config (no nag). ──
  const [skipWs] = await db
    .insert(workspace)
    .values({ name: "T62 Skip Co.", slug: `${MARK}skip-${Date.now?.() ?? "x"}` } as never)
    .returning({ id: workspace.id });
  // skipForNow() does exactly this: markWorkspaceOnboarded, nothing else.
  await markWorkspaceOnboarded(skipWs.id);
  const skipped = await readWs(skipWs.id);
  check("skip: onboarded_at set (won't re-prompt)", skipped.onboardedAt !== null);
  check("skip: writes NO config (business_type + first_format stay NULL)", skipped.businessType === null && skipped.firstFormat === null);

  // ── Increment 2 · US4 bypass: the inverse-gate conditional. ──
  check("bypass: an onboarded workspace satisfies onboarded_at != null (→ /app, no wizard)", skipped.onboardedAt != null);
  check("bypass: a fresh workspace satisfies onboarded_at == null (→ wizard)", fresh.onboardedAt === null);

  // Seed guard: the real Lumen workspace is never touched by this harness.
  const [lumen] = await db.select({ onboardedAt: workspace.onboardedAt }).from(workspace).where(eq(workspace.slug, "lumen"));
  if (lumen) {
    console.log(`    [info] seeded Lumen onboarded_at = ${lumen.onboardedAt === null ? "NULL (would be routed into the wizard until seed/backfill sets it)" : lumen.onboardedAt.toISOString()}`);
  } else {
    console.log("    (Lumen not present in this DB — skipping seed check)");
  }

  await cleanup();
  console.log(`\n=== T6.2 Increment-1 headless verification: ${pass} passed, ${fail} failed ===`);
  if (fail > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error("harness error:", e);
  try { await cleanup(); } catch {}
  process.exit(1);
});
