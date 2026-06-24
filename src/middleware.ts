import { NextResponse, type NextRequest } from "next/server";

// Layer 1 of the two-layer security model (FR-008). A coarse ROUTE gate over /app/*:
// no Auth.js session cookie → redirect to /login (no flash of protected data). This is
// a cookie-PRESENCE check, deliberately NOT a session validation — it keeps the
// middleware free of a DB read / auth() import (no edge/runtime friction, build green).
//
// The REAL validation is Layer 2 (FR-017): every /app surface resolves the session via
// getCurrentWorkspace() (auth() + workspace-scoped reads), so a present-but-expired or
// tampered cookie still renders nothing — it redirects at the page. Middleware protects
// ROUTES; loaders protect READS. BOTH are required for multi-tenant safety.
export function middleware(req: NextRequest) {
  const hasSession =
    req.cookies.has("authjs.session-token") ||
    req.cookies.has("__Secure-authjs.session-token");
  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/app/:path*"] };
