// The honest block — shown when a token is expired / used / not-found. T7.2b PORTs the
// polished `10 _ Expired link` design over the T7.2 minimal state. PERSONALIZED with the
// sending workspace's name for expired/used (the token maps to a real workspace the holder
// heard from — not a leak); GENERIC for not-found (no workspace to name). The "Ask
// {Workspace} for a new link" line is HONEST GUIDANCE TEXT, not a button — there is no
// customer→merchant request channel, so a control that did nothing would be a dead control
// (P-XIII). Mobile-first, Pressroom tokens, light + dark. "powered by Weavova" is the only mark.

const COPY = {
  expired: {
    title: "This link has expired.",
    body: "For your security, collection links only stay open for a little while.",
  },
  used: {
    title: "This link has already been used.",
    body: "Thanks — your submission is in.",
  },
  not_found: {
    title: "We couldn't find that link.",
    body: "Double-check the link the business sent you, or ask them for a new one.",
  },
} as const;

export function CaptureBlock({
  kind,
  workspaceName,
}: {
  kind: "expired" | "used" | "not_found";
  workspaceName?: string;
}) {
  const { title, body } = COPY[kind];
  // Personalize only when we actually have the workspace (expired/used). not_found has none.
  const ws = kind === "not_found" ? null : (workspaceName ?? null);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 py-16">
      <div className="w-full max-w-[420px] text-center">
        {ws && (
          <span
            className="mx-auto mb-6 flex size-12 items-center justify-center rounded-control bg-sunken font-display text-display-xs text-ink-2"
            aria-hidden
          >
            {ws.charAt(0)}
          </span>
        )}
        <h1 className="font-display text-display-md text-ink">{title}</h1>
        <p className="mt-3 font-ui text-body text-ink-2">
          {body}
          {ws && ` ${ws} can send you a fresh one.`}
        </p>
        {ws && (
          // Honest guidance — NOT a button (no customer→merchant request channel exists).
          <p className="mt-8 font-ui text-body-sm font-medium text-ink">
            Ask {ws} for a new link
          </p>
        )}
        <p className="mt-10 font-ui text-label uppercase tracking-wide text-ink-3">
          powered by Weavova
        </p>
      </div>
    </main>
  );
}
