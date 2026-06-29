// The honest block (T7.2 — US5). Shown when a token is expired / used / not-found. This
// is the MINIMAL honest state carrying the screen-10 intent ("This link has expired… for
// your security, collection links only stay open for a little while"); the POLISHED
// `10 _ Expired link` port (brand-framed) is T7.2b. No dead end, no 500, no workspace leak
// (P-XIII). Mobile-first, Pressroom tokens, light + dark.

const COPY: Record<
  "expired" | "used" | "not_found",
  { title: string; body: string }
> = {
  expired: {
    title: "This link has expired.",
    body: "For your security, collection links only stay open for a little while. Ask the business that sent it for a fresh one.",
  },
  used: {
    title: "This link has already been used.",
    body: "Thanks — your submission is in. If you meant to send something else, ask the business for a new link.",
  },
  not_found: {
    title: "We couldn't find that link.",
    body: "Double-check the link the business sent you, or ask them for a new one.",
  },
};

export function CaptureBlock({
  kind,
}: {
  kind: "expired" | "used" | "not_found";
}) {
  const { title, body } = COPY[kind];
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 py-16">
      <div className="w-full max-w-[420px] text-center">
        <h1 className="font-display text-display-md text-ink">{title}</h1>
        <p className="mt-3 font-ui text-body text-ink-2">{body}</p>
        <p className="mt-10 font-ui text-label uppercase tracking-wide text-ink-3">
          powered by Weavova
        </p>
      </div>
    </main>
  );
}
