"use server";

import { redirect } from "next/navigation";
import { signIn } from "@/auth";

// Minimal email validation. NOTE: the plan said "Zod-validated", but `zod` is not an
// installed dependency and only next-auth + @auth/drizzle-adapter were approved this
// slice — so we validate inline rather than silently add an unapproved 12th dep
// (flagged for review). If Zod is later adopted project-wide, swap this for a schema.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Magic-link sign-in (US1). Sends the Resend link, then routes to the honest
// check-your-email state naming the address. `redirect: false` so signIn returns here
// instead of throwing its own redirect — we own the navigation (to name the address).
export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!EMAIL_RE.test(email)) {
    redirect("/login?error=invalid-email");
  }

  try {
    await signIn("resend", { email, redirect: false });
  } catch {
    redirect("/login?error=send-failed");
  }

  redirect(`/verify?email=${encodeURIComponent(email)}`);
}
