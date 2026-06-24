import NextAuth from "next-auth";
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
    // Workspaceless-user provisioning (T012): a brand-new user with no membership
    // gets a personal workspace + an owner membership, so getCurrentWorkspace()
    // always resolves (no throw path for "authenticated but no workspace"). The
    // SEEDED demo owner already has a membership, so this NEVER fires for them —
    // they link into the existing Lumen workspace by verified email.
    async createUser({ user }) {
      if (!user.id) return;
      const db = getDb();
      const existing = await db
        .select({ id: membership.id })
        .from(membership)
        .where(eq(membership.userId, user.id))
        .limit(1);
      if (existing[0]) return;

      const base = (user.email?.split("@")[0] ?? "workspace")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      const slug = `${base}-${user.id.slice(0, 8)}`;
      const [ws] = await db
        .insert(workspace)
        .values({ name: user.name ?? "My workspace", slug })
        .returning({ id: workspace.id });
      await db
        .insert(membership)
        .values({ userId: user.id, workspaceId: ws.id, role: "owner" })
        .onConflictDoNothing();
    },
  },
}));
