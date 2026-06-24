"use server";

import { signOut } from "@/auth";

// Sign-out (US4 / T021). A server action so the client UserMenu can submit it as a
// form action. Ends the session and returns to /login. Additive — it does not touch
// how any surface reads identity.
export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
