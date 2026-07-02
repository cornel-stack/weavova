import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentWorkspace } from "@/lib/session";
import { skipForNow } from "./actions";

// T6.2 — the onboarding wizard shell. Its OWN minimal chrome (not the app rail): a warm
// paper canvas, the Weavova wordmark, and the global "Skip for now" affordance. Reads the
// workspace (Layer 2, DB) so it can run the INVERSE gate: a workspace that is already
// onboarded (incl. the seeded Lumen owner, or anyone who just finished) can never re-enter
// the wizard — it redirects to /app. getCurrentWorkspace() already carries onboarded_at
// (T6.1), so this is a free read; middleware stays DB-free.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Set up your workspace — Weavova",
};

export default async function OnboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const workspace = await getCurrentWorkspace();
  if (workspace.onboardedAt != null) {
    redirect("/app");
  }

  return (
    <div className="min-h-dvh bg-paper text-ink">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-6 py-6">
        <span className="font-display text-display-xs text-ink">
          Weavova<span className="text-persimmon">.</span>
        </span>
        {/* "Skip for now" — the global affordance on every step (US3). Marks the workspace
            onboarded (no nag, no re-prompt) and exits to /app; writes no step config. */}
        <form action={skipForNow}>
          <button
            type="submit"
            className="rounded-control px-3 py-2 font-ui text-body-sm text-ink-3 transition-colors duration-200 ease-pressroom hover:text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Skip for now
          </button>
        </form>
      </header>
      <main className="mx-auto w-full max-w-3xl px-6 pb-20">{children}</main>
    </div>
  );
}
