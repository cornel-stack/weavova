// T6.1 headless verification harness — quickstart scenarios A, C, E, F, G.
// Exercises the REAL bootstrap (src/auth.ts bootstrapWorkspaceIfNeeded) against the DB with
// throwaway rows (email prefix "t61-verify-"), then cleans up. Never touches Lumen/seed data.
// Run: node --env-file=.env.local scripts/t61-verify.mts
import { eq, like } from "drizzle-orm";
import { getDb } from "../src/db/client";
import { membership, users, workspace } from "../src/db/schema";
import { bootstrapWorkspaceIfNeeded } from "../src/auth";
import {
  getDashboardSummary,
  getProofs,
  listRequestTemplates,
  getLibraryClips,
  getShowcase,
  getConsentLedger,
  getBrandKit,
} from "../src/db/queries";

const db = getDb();
const MARK = "t61-verify-";
let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "  ✓ PASS" : "  ✗ FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (ok) pass++;
  else fail++;
}

async function makeUser(local: string, name: string | null): Promise<string> {
  const [u] = await db
    .insert(users)
    .values({ name, email: `${MARK}${local}@example.com` })
    .returning({ id: users.id });
  return u.id;
}
async function wsCount(userId: string) {
  const rows = await db
    .select({ wsId: membership.workspaceId })
    .from(membership)
    .where(eq(membership.userId, userId));
  return rows;
}

async function cleanup() {
  // delete memberships + workspaces + users created by this harness
  const testUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(like(users.email, `${MARK}%`));
  for (const u of testUsers) {
    const ms = await wsCount(u.id);
    for (const m of ms) {
      await db.delete(membership).where(eq(membership.workspaceId, m.wsId));
      await db.delete(workspace).where(eq(workspace.id, m.wsId));
    }
    await db.delete(users).where(eq(users.id, u.id));
  }
}

async function main() {
  await cleanup(); // start clean in case of a prior aborted run

  // ---- Scenario A + onboarded semantics: brand-new user (magic-link shape: name null) ----
  console.log("\n[A] Brand-new user bootstrap (magic-link shape, name=null)");
  const aId = await makeUser("alpha", null);
  await bootstrapWorkspaceIfNeeded({ id: aId, email: `${MARK}alpha@example.com`, name: null } as never);
  const aMs = await wsCount(aId);
  check("exactly one membership created", aMs.length === 1, `got ${aMs.length}`);
  if (aMs[0]) {
    const [ws] = await db.select().from(workspace).where(eq(workspace.id, aMs[0].wsId));
    check("name = '{email local-part}'s workspace'", ws?.name === `${MARK}alpha's workspace`, ws?.name);
    check("onboarded_at IS NULL (un-onboarded)", ws?.onboardedAt === null, String(ws?.onboardedAt));
    check(
      "slug is deterministic: base prefix + FULL user.id suffix",
      !!ws && ws.slug.startsWith(`${MARK}alpha`) && ws.slug.endsWith(aId),
      ws?.slug,
    );
    const [m] = await db.select().from(membership).where(eq(membership.workspaceId, aMs[0].wsId));
    check("membership role = owner", m?.role === "owner", m?.role);
  }

  // ---- Scenario A2: Google shape (name present) → "{firstName}'s workspace" ----
  console.log("\n[A2] Brand-new user bootstrap (Google shape, name='Ada Lovelace')");
  const gId = await makeUser("google", "Ada Lovelace");
  await bootstrapWorkspaceIfNeeded({ id: gId, email: `${MARK}google@example.com`, name: "Ada Lovelace" } as never);
  const gMs = await wsCount(gId);
  if (gMs[0]) {
    const [ws] = await db.select().from(workspace).where(eq(workspace.id, gMs[0].wsId));
    check("name = '{firstName}'s workspace'", ws?.name === "Ada's workspace", ws?.name);
  }

  // ---- Scenario E: concurrent double bootstrap → exactly ONE workspace, loser swallows ----
  console.log("\n[E] Concurrent double bootstrap (race guard)");
  const eId = await makeUser("echo", "Grace Hopper");
  const u = { id: eId, email: `${MARK}echo@example.com`, name: "Grace Hopper" } as never;
  let threw = false;
  try {
    await Promise.all([bootstrapWorkspaceIfNeeded(u), bootstrapWorkspaceIfNeeded(u)]);
  } catch (e) {
    threw = true;
    console.log("    (unexpected throw)", (e as Error).message);
  }
  const eMs = await wsCount(eId);
  const eWs = await db.select().from(workspace).where(like(workspace.slug, `${MARK}echo-%`));
  check("no throw escaped (loser swallowed unique-violation)", !threw);
  check("exactly ONE membership after concurrent race", eMs.length === 1, `got ${eMs.length}`);
  check("exactly ONE workspace row after concurrent race", eWs.length === 1, `got ${eWs.length}`);

  // ---- Scenario F: stranded membership-less user → self-heal on next sign-in ----
  console.log("\n[F] Stranded user self-heal");
  const fId = await makeUser("foxtrot", "Alan Turing");
  const fUser = { id: fId, email: `${MARK}foxtrot@example.com`, name: "Alan Turing" } as never;
  await bootstrapWorkspaceIfNeeded(fUser); // first create
  let fMs = await wsCount(fId);
  // strand: delete membership + workspace, leaving only the user row
  for (const m of fMs) {
    await db.delete(membership).where(eq(membership.workspaceId, m.wsId));
    await db.delete(workspace).where(eq(workspace.id, m.wsId));
  }
  const strandedMs = await wsCount(fId);
  check("stranded state reached (0 memberships)", strandedMs.length === 0, `got ${strandedMs.length}`);
  await bootstrapWorkspaceIfNeeded(fUser); // next sign-in self-heals
  fMs = await wsCount(fId);
  check("self-heal repaired the user (1 membership)", fMs.length === 1, `got ${fMs.length}`);

  // ---- Scenario C: existing-member (seed-shaped) sign-in is a NO-OP ----
  console.log("\n[C] Existing-member no-op (seed-shaped; uses a throwaway user with a membership)");
  // Use user A who already has a workspace; a second bootstrap must NOT create another.
  const beforeC = (await wsCount(aId)).length;
  await bootstrapWorkspaceIfNeeded({ id: aId, email: `${MARK}alpha@example.com`, name: null } as never);
  const afterC = (await wsCount(aId)).length;
  check("no new workspace for a user who already has one", beforeC === 1 && afterC === 1, `before ${beforeC}, after ${afterC}`);
  // And the REAL seeded owner, if present, is untouched (read-only assert).
  const seededOwnerEmail = process.env.SEED_OWNER_EMAIL ?? "amalacornel@gmail.com";
  const [seedOwner] = await db.select({ id: users.id }).from(users).where(eq(users.email, seededOwnerEmail));
  if (seedOwner) {
    const before = (await wsCount(seedOwner.id)).length;
    await bootstrapWorkspaceIfNeeded({ id: seedOwner.id, email: seededOwnerEmail, name: "Maya K." } as never);
    const after = (await wsCount(seedOwner.id)).length;
    check("seeded Lumen owner: membership count unchanged (no-op)", before === after && before >= 1, `before ${before}, after ${after}`);
  } else {
    console.log("    (seeded owner not present in this DB — skipping live seed assert)");
  }

  // ---- Scenario G: a genuinely-empty new workspace drives honest empty states (data layer) ----
  console.log("\n[G] Empty-state data for a genuinely-empty new workspace (user A's workspace)");
  const aWsId = (await wsCount(aId))[0]?.wsId as string;
  const [summary, proofs, templates, clips, showcase, ledger, kit] = await Promise.all([
    getDashboardSummary(aWsId),
    getProofs(aWsId),
    listRequestTemplates(aWsId),
    getLibraryClips(aWsId),
    getShowcase(aWsId),
    getConsentLedger(aWsId),
    getBrandKit(aWsId),
  ]);
  check("E1 dashboard: totalProof === 0 → DashboardEmpty", summary.totalProof === 0, `totalProof=${summary.totalProof}`);
  check("E2 inbox: getProofs === [] → InboxEmpty", proofs.length === 0, `len=${proofs.length}`);
  check("E3 requests: listRequestTemplates === [] → 'No requests yet.'", templates.length === 0, `len=${templates.length}`);
  check("E4 library: getLibraryClips === [] → LibraryEmpty", clips.length === 0, `len=${clips.length}`);
  check("E5 showcase: getShowcase === [] → ShowcaseEmpty", showcase.length === 0, `len=${showcase.length}`);
  check("E6 consent: getConsentLedger === [] → consent empty", ledger.length === 0, `len=${ledger.length}`);
  check("E7 brand: getBrandKit === null → editor opens at defaults", kit === null, `kit=${kit === null ? "null" : "present"}`);

  await cleanup();
  console.log(`\n=== T6.1 headless verification: ${pass} passed, ${fail} failed ===`);
  if (fail > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error("harness error:", e);
  try { await cleanup(); } catch {}
  process.exit(1);
});
