import type { Metadata } from "next";
import Link from "next/link";
import { AuthFrame } from "@/components/auth/auth-frame";

export const metadata: Metadata = {
  title: "Check your email — Weavova",
};

// The honest "magic-link sent / check your email" state (T6 US1, FR-002), ported onto
// the Pressroom split frame (screen 4). SUPERSESSION HELD: magic-LINK, not a 6-digit
// code — no code-input boxes, no "Verify email" submit. Screen 4's "Resend code 0:42"
// row becomes the honest magic-link equivalent: "request a new link".
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <AuthFrame>
      <h1 className="font-display text-display-md text-ink">Check your email.</h1>
      <p className="mt-2 font-ui text-body text-ink-2">
        {email ? (
          <>
            We sent a sign-in link to{" "}
            <span className="font-medium text-ink">{email}</span>. Open it on this
            device to continue.
          </>
        ) : (
          <>
            We sent a sign-in link to your inbox. Open it on this device to
            continue.
          </>
        )}
      </p>

      <p className="mt-6 font-ui text-body-sm text-ink-3">
        Didn&rsquo;t get it?{" "}
        <Link
          href="/login"
          className="font-medium text-persimmon-deep underline underline-offset-2"
        >
          Request a new link
        </Link>
        . The link expires shortly.
      </p>
    </AuthFrame>
  );
}
