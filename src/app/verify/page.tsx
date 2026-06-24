import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Check your email — Weavova",
};

// The honest "magic-link sent / check your email" state (T6 US1, FR-002). Names the
// address when we have it (we pass it from the sign-in action). Auth.js also routes
// here as its verifyRequest page. Plain copy (P-XVII); no fabricated data (P-XIV).
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 text-ink">
      <div className="w-full max-w-[400px] text-center">
        <p className="font-display text-display-md text-ink">Weavova</p>

        <div className="mt-8 rounded-modal border border-hairline bg-card p-6 shadow-clip">
          <h1 className="font-display text-display-sm text-ink">
            Check your email
          </h1>
          <p className="mt-2 font-ui text-body text-ink-2">
            {email ? (
              <>
                We sent a sign-in link to{" "}
                <span className="font-medium text-ink">{email}</span>. Open it on
                this device to continue.
              </>
            ) : (
              <>
                We sent a sign-in link to your inbox. Open it on this device to
                continue.
              </>
            )}
          </p>
          <p className="mt-4 font-ui text-body-sm text-ink-3">
            The link expires shortly. If it has not arrived or has expired,{" "}
            <Link
              href="/login"
              className="text-persimmon-deep underline underline-offset-2"
            >
              request a new one
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
