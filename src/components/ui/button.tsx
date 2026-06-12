import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "strong" | "quiet" | "danger";

// Persimmon is reserved to the PRIMARY action only (Principle IV).
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-persimmon text-on-accent hover:bg-persimmon-deep",
  strong: "bg-ink text-paper hover:bg-ink-2",
  quiet: "border border-rule text-ink hover:bg-sunken",
  danger: "bg-danger text-on-accent hover:opacity-90",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-control px-4 py-2 font-ui text-heading-sm font-medium transition-colors duration-200 ease-pressroom focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
