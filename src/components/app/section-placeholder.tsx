// Minimal placeholder for a section route — replaced by real content in a later
// tier. Renders inside the /app shell.
export function SectionPlaceholder({
  title,
  tier,
}: {
  title: string;
  tier: string;
}) {
  return (
    <div className="mx-auto max-w-content px-6 py-16">
      <h1 className="font-display text-display-lg text-ink">{title}</h1>
      <p className="mt-3 font-ui text-body text-ink-2">
        Coming in a later tier ({tier}).
      </p>
    </div>
  );
}
