import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/auth-frame";
import { sendMagicLink, signInWithGoogle } from "./actions";

export const metadata: Metadata = {
  title: "Sign in — Weavova",
};

// Sign-in (T6 US1 magic-link + US2 Google), ported onto the Pressroom split frame
// (screen 1). Held supersessions: NO password field, NO "Forgot password?", NO GitHub
// (all superseded by decision — see spec "Design reconciliation"). Persimmon only on
// the primary action; Google is a quiet ink-outline secondary. Auth logic unchanged.
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
    <AuthFrame>
      <h1 className="font-display text-display-md text-ink">Welcome back.</h1>
      <p className="mt-1 font-ui text-body-sm text-ink-2">
        Sign in to your Pressroom.
      </p>

      {message && (
        <p
          role="alert"
          className="mt-5 rounded-control border border-danger/30 bg-danger-tint px-3 py-2 font-ui text-body-sm text-danger"
        >
          {message}
        </p>
      )}

      <form action={signInWithGoogle} className="mt-6">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2.5 rounded-control border border-rule bg-card px-4 py-2.5 font-ui text-body font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-hairline" />
        <span className="font-ui text-label uppercase tracking-wide text-ink-3">
          or
        </span>
        <span className="h-px flex-1 bg-hairline" />
      </div>

      <form action={sendMagicLink} className="flex flex-col gap-3">
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
    </AuthFrame>
  );
}
