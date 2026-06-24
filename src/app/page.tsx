import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Root entry (FR-020): unauthenticated → sign-in; authenticated → dashboard. A real
// marketing landing is a separate Public-site surface, out of scope for T6. auth()
// reads cookies → this route is dynamic.
export default async function Home() {
  const session = await auth();
  redirect(session?.user ? "/app" : "/login");
}
