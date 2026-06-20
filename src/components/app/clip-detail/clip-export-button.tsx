"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

// The single-export copy island (T4-B4, Client). Genuinely copies the clip's
// post-text package (assembled server-side at clip-detail render — research §4, so
// the clipboard write is synchronous, inside the click gesture, and gesture-safe).
// A-11: the control REALLY copies — and if the Clipboard API is unavailable/blocked,
// it falls back to a focused, pre-selected read-only textarea so the user can always
// copy manually. Never a dead control. Owned post-text only; the T8 sample note rides
// inside `text` (FR-019). Secondary strength — persimmon stays the detail's single
// primary ("Re-make in studio").

export function ClipExportButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const fallbackRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flashCopied() {
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  async function onCopy() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(text);
      flashCopied();
    } catch {
      // Fallback: reveal the text, select it, and try the legacy copy path so the
      // control genuinely works even where the async Clipboard API is blocked.
      setShowFallback(true);
      requestAnimationFrame(() => {
        const el = fallbackRef.current;
        if (!el) return;
        el.focus();
        el.select();
        try {
          if (document.execCommand("copy")) flashCopied();
        } catch {
          // leave the text selected for manual copy — still not a dead control
        }
      });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex items-center justify-center gap-2 rounded-control border border-rule bg-card px-4 py-2.5 font-ui text-body-sm font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {copied ? (
          <Check className="size-4 text-success" strokeWidth={1.5} aria-hidden />
        ) : (
          <Copy className="size-4" strokeWidth={1.5} aria-hidden />
        )}
        {copied ? "Copied" : "Copy post text"}
      </button>

      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Post text copied to clipboard" : ""}
      </span>

      {showFallback && (
        <label className="flex flex-col gap-1">
          <span className="font-ui text-body-sm text-ink-3">
            Copy the post text manually:
          </span>
          <textarea
            ref={fallbackRef}
            readOnly
            value={text}
            rows={6}
            className="w-full resize-none rounded-control border border-hairline bg-card p-3 font-ui text-body-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          />
        </label>
      )}
    </div>
  );
}
