import type { Metadata, Viewport } from "next";
import { getCaptureRequestByToken } from "@/db/queries";
import { CaptureFlow } from "./capture-flow";
import { CaptureBlock } from "./block";

// The public capture page (T7.2) — /c/[token]. UNAUTHENTICATED: it lives OUTSIDE the
// /app middleware matcher and inherits ONLY the root layout (fonts + ThemeProvider) —
// no app chrome, no session. The workspace + brand are resolved FROM THE TOKEN
// (token → request → workspace → brand kit); getCurrentWorkspace is never called here.
// A phone surface — mobile-first.

export const metadata: Metadata = {
  title: "Share your experience",
  robots: { index: false, follow: false }, // a private per-customer link, not indexable
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function CapturePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const resolved = await getCaptureRequestByToken(token);

  if (resolved.status !== "ok") {
    // Honest block — expired / used / not-found (polished screen-10 port). expired/used carry
    // the workspace name for personalization; not-found has none (generic, no leak).
    return (
      <CaptureBlock
        kind={resolved.status}
        workspaceName={
          resolved.status === "not_found" ? undefined : resolved.workspaceName
        }
      />
    );
  }

  return <CaptureFlow request={resolved.request} />;
}
