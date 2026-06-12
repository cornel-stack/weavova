"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch: theme is only known on the client.
  useEffect(() => setMounted(true), []);

  const isInk = theme === "ink";

  return (
    <button
      type="button"
      onClick={() => setTheme(isInk ? "daylight" : "ink")}
      aria-label={
        mounted
          ? `Switch to ${isInk ? "Daylight" : "Ink"} theme`
          : "Toggle theme"
      }
      className="inline-flex items-center gap-2 rounded-control border border-rule px-3 py-1.5 font-ui text-body-sm text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {mounted && isInk ? (
        <Sun className="size-4" strokeWidth={1.5} aria-hidden />
      ) : (
        <Moon className="size-4" strokeWidth={1.5} aria-hidden />
      )}
      <span>{mounted ? (isInk ? "Daylight" : "Ink") : "Theme"}</span>
    </button>
  );
}
