import type { Metadata } from "next";
import { sendMagicLink } from "./actions";

export const metadata: Metadata = {
  title: "Sign in — Weavova",
};

// Sign-in (T6 US1). Magic-link only this increment; Google arrives next increment
// (T020). On-token (Pressroom) port — no fabricated counts/activity (P-XIV), plain
// copy (P-XVII), persimmon only on the primary action.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message =
    error === "invalid-email"
      ? "That email doesn't look right. Try again."
      : error === "send-failed"
        ? "We couldn't send the link just now. Try again."
        : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-6 text-ink">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <p className="font-display text-display-md text-ink">Weavova</p>
          <p className="mt-1 font-ui text-body-sm text-ink-3">
            The customer is the headline.
          </p>
        </div>

        <div className="rounded-modal border border-hairline bg-card p-6 shadow-clip">
          <h1 className="font-display text-display-sm text-ink">Sign in</h1>
          <p className="mt-1 font-ui text-body-sm text-ink-2">
            A one-time sign-in link by email — no password.
          </p>

          {message && (
            <p
              role="alert"
              className="mt-4 rounded-control border border-danger/30 bg-danger-tint px-3 py-2 font-ui text-body-sm text-danger"
            >
              {message}
            </p>
          )}

          <form action={sendMagicLink} className="mt-5 flex flex-col gap-3">
            <label
              htmlFor="email"
              className="font-ui text-label uppercase tracking-wide text-ink-3"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="rounded-control border border-rule bg-card px-3 py-2.5 font-ui text-body text-ink outline-none placeholder:text-ink-3 focus:border-ink"
            />
            <button
              type="submit"
              className="mt-1 rounded-control bg-persimmon px-4 py-2.5 font-ui text-body font-medium text-on-accent transition-colors duration-200 ease-pressroom hover:bg-persimmon-deep"
            >
              Send magic link
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
