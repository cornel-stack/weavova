"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// A small dependency-free popover: manages open state, closes on Esc and
// outside-click, and restores focus to the trigger on Esc. Used by the
// workspace switcher and the user menu (no cmdk — that is the palette only).
export function Popover({
  trigger,
  children,
  align = "start",
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (props: { close: () => void }) => ReactNode;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        ref.current?.querySelector<HTMLElement>("button")?.focus();
      }
    }
    function onPointer(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          role="menu"
          className={`absolute top-full z-40 mt-1 ${
            align === "end" ? "right-0" : "left-0"
          }`}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}
