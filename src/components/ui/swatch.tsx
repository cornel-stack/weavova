export function Swatch({
  name,
  swatchClass,
  daylight,
  ink,
}: {
  name: string;
  swatchClass: string;
  daylight: string;
  ink: string;
}) {
  return (
    <div>
      <div
        className={`h-16 rounded-control border border-hairline ${swatchClass}`}
      />
      <div className="mt-2 font-mono text-mono-sm text-ink">{name}</div>
      <div className="font-mono text-mono-sm text-ink-3">
        {daylight} / {ink}
      </div>
    </div>
  );
}
