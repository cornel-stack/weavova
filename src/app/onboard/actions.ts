"use server";

import { redirect } from "next/navigation";
import {
  markWorkspaceOnboarded,
  setWorkspaceBusinessType,
  setWorkspaceFirstFormat,
} from "@/db/queries";
import { isBusinessType, isFirstFormat } from "@/lib/onboarding";
import { getCurrentWorkspace } from "@/lib/session";

// T6.2 · Onboarding wizard — server actions. Every action resolves the workspace
// SERVER-SIDE via getCurrentWorkspace() (never a client-supplied id). Writes are
// allowlist-guarded in the data layer. Step 3 (brand) reuses the existing brand actions
// directly; Step 2 (source) has no write. Skip is the Increment-1 MINIMAL control (below).

// Step 1 → save business_type, advance to Step 2.
export async function saveBusinessTypeAndContinue(formData: FormData): Promise<void> {
  const value = formData.get("businessType");
  if (!isBusinessType(value)) {
    // The UI requires a selection before Continue is enabled; this is a server-side guard.
    return;
  }
  const ws = await getCurrentWorkspace();
  await setWorkspaceBusinessType(ws.id, value);
  redirect("/onboard/source");
}

// Step 4 → save first_format (PREFERENCE only — no render, P-XIV), then FINISH: set
// onboarded_at (the terminal write) and land in the app. The forward gate then no-ops.
// The "?tour=1" param launches the one-shot dashboard spotlight (US5); a refresh without it
// shows no tour (no persisted flag).
export async function saveFirstFormatAndFinish(formData: FormData): Promise<void> {
  const value = formData.get("firstFormat");
  if (!isFirstFormat(value)) {
    return;
  }
  const ws = await getCurrentWorkspace();
  await setWorkspaceFirstFormat(ws.id, value);
  await markWorkspaceOnboarded(ws.id);
  redirect("/app?tour=1");
}

// "Skip for now" — the global affordance on every step (US3). The user chose to skip, so we
// set onboarded_at (they are NOT nagged again — the forward gate no-ops and the inverse gate
// blocks re-entry) and land them in the app. It writes NO step config: business_type /
// first_format / the brand kit stay exactly as the user left them (untouched steps remain
// NULL — partial-safe). Skip goes to "/app" (no tour; the tour is the finish-path flourish).
export async function skipForNow(): Promise<void> {
  const ws = await getCurrentWorkspace();
  await markWorkspaceOnboarded(ws.id);
  redirect("/app");
}
