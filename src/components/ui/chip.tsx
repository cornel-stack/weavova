import type { ReactNode } from "react";

export type ChipTone = "success" | "warning" | "danger";

const TONES: Record<ChipTone, string> = {
  success: "bg-success-tint text-success",
  warning: "bg-warning-tint text-warning",
  danger: "bg-danger-tint text-danger",
};

export function Chip({
  tone,
  children,
}: {
  tone: ChipTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 font-ui text-label uppercase tracking-wide ${TONES[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-pill bg-current" />
      {children}
    </span>
  );
}
