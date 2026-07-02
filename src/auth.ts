import NextAuth from "next-auth";
import type { User } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  accounts,
  membership,
  sessions,
  users,
  verificationTokens,
  workspace,
} from "@/db/schema";

// ============================================================================
// T6.1 — first-sign-in workspace bootstrap (hardening the T6 provisioning).
//
// Runs from events.signIn (below), so it fires on EVERY successful sign-in for BOTH
// providers (magic-link + Google; user.id is present on the database-session strategy).
// This is a strict superset of the old events.createUser trigger and makes the bootstrap
// SELF-HEALING: a stranded, membership-less user is repaired on their next sign-in, not
// only at user-row creation.
//
// Guarantees:
//  • Fast NO-OP for anyone who already has ANY membership (the seeded Lumen owner, every
//    returning user, and the account-linking case — a 2nd provider links to the SAME
//    user.id, so the membership is found). One cheap `SELECT ... LIMIT 1`, then return.
//  • ATOMIC create — workspace + owner membership in ONE getDb().batch([...]) (a single
//    neon-http transaction). No partial create: never an orphan workspace or membership.
//  • DB-ENFORCED IDEMPOTENCY — the workspace slug is a DETERMINISTIC function of the FULL
//    user.id under workspace.slug UNIQUE. Two concurrent first sign-ins both pass the guard
//    and both attempt the batch; the loser's batch aborts IN FULL on the slug unique
//    violation (nothing partial commits), and we SWALLOW that violation as success (the
//    workspace+membership the winner created already resolve). This is a real DB guard, not
//    a check-then-act race.
// ============================================================================

// Postgres unique_violation. neon-http surfaces the pg SQLSTATE on `.code`; we also match
// the message defensively across driver/wrapper shapes.
function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  if (code === "23505") return true;
  const message = (error as { message?: unknown }).message;
  return (
    typeof message === "string" &&
    (message.includes("duplicate key") ||
      message.includes("workspace_slug_unique") ||
      message.includes("unique constraint"))
  );
}

// Exported for the T6.1 headless verification harness (quickstart scenarios E/F/G + A/C DB
// asserts). No runtime-surface change — the auth config calls it from events.signIn below.
export async function bootstrapWorkspaceIfNeeded(user: User): Promise<void> {
  if (!user.id) return;
  const db = getDb();

  // Fast no-op: any existing membership → done. Seeded owner, returning users, and the
  // account-linking case (2nd provider → same user.id) all short-circuit here.
  const existing = await db
    .select({ id: membership.id })
    .from(membership)
    .where(eq(membership.userId, user.id))
    .limit(1);
  if (existing[0]) return;

  // Naming (FR-007): "{firstName}'s workspace" when a name exists (Google), else derived
  // from the email local-part (magic-link supplies email only). email is NOT NULL, so the
  // result is never empty. The onboarding wizard renames later.
  const emailLocalPart = user.email?.split("@")[0] ?? "workspace";
  const firstName = user.name?.trim().split(/\s+/)[0];
  const name = firstName
    ? `${firstName}'s workspace`
    : `${emailLocalPart}'s workspace`;

  // Deterministic slug from the FULL user.id (not a truncated slice): the idempotency key
  // under workspace.slug UNIQUE. Same user ⇒ same slug ⇒ a concurrent duplicate collides.
  const base = emailLocalPart.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const slug = `${base}-${user.id}`;
  const workspaceId = crypto.randomUUID();

  try {
    // Atomic: one transaction. onboardedAt left NULL (freshly created, not yet onboarded).
    await db.batch([
      db.insert(workspace).values({ id: workspaceId, name, slug }),
      db
        .insert(membership)
        .values({ userId: user.id, workspaceId, role: "owner" })
        .onConflictDoNothing(),
    ]);
  } catch (error) {
    // The race loser (or a re-fire) — the deterministic slug already exists, so the batch
    // aborted in full. That's idempotent SUCCESS: the winner's workspace + owner membership
    // (co-created in the same batch) already resolve for this user. Swallow and proceed.
    if (isUniqueViolation(error)) return;
    // Any other failure: log and let the user land. No usable half-state exists (the batch
    // is atomic), getCurrentWorkspace() surfaces the anomaly, and the next sign-in re-heals.
    console.error("[T6.1] workspace bootstrap failed", error);
  }
}

// ============================================================================
// Auth.js v5 (T6). The real auth layer behind the session seam (src/lib/session.ts).
//
// LAZY CONFIG (function form): NextAuth(() => config) means module import does NOT
// touch the DB or read AUTH_* — `next build` / CI stay green without DATABASE_URL or
// any AUTH_* set. getDb() and process.env are read at REQUEST time, mirroring the
// lazy db client. Providers read their creds from env by convention:
//   Resend → AUTH_RESEND_KEY ;  Google → AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET.
// ============================================================================

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database" },
  pages: { signIn: "/login", verifyRequest: "/verify" },
  providers: [
    // Magic-link via Resend (apiKey ← AUTH_RESEND_KEY; from ← AUTH_EMAIL_FROM,
    // which MUST be a verified Resend sender domain).
    Resend({ from: process.env.AUTH_EMAIL_FROM }),

    // Google OAuth.
    //
    // SECURITY INVARIANT (T010 / research.md D3): `allowDangerousEmailAccountLinking`
    // links a Google sign-in to an existing user by EMAIL (FR-003 — one user per
    // verified email). This is SAFE ONLY because every configured provider yields a
    // VERIFIED email — Google asserts `email_verified`, and the Resend magic-link
    // proves mailbox control. If a provider that does NOT verify email is ever added,
    // REMOVE this flag (or gate linking on verification) or it becomes an
    // account-takeover vector. Re-evaluate this whenever a provider is added.
    Google({ allowDangerousEmailAccountLinking: true }),
  ],
  events: {
    // T6.1 — fire the bootstrap on EVERY sign-in (both providers), not just at user-row
    // creation. bootstrapWorkspaceIfNeeded is a guarded fast no-op for anyone who already
    // has a membership (seeded Lumen owner, returning users, account-linking), and creates
    // an atomic workspace + owner membership for a brand-new OR stranded membership-less
    // user. See the header comment for the idempotency/atomicity/self-heal contract.
    async signIn({ user }) {
      await bootstrapWorkspaceIfNeeded(user);
    },
  },
}));
