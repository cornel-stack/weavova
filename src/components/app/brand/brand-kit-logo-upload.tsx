"use client";

import { useRef, useState } from "react";
import { ImagePlus, Upload } from "lucide-react";
import { presignBrandKitLogoUpload } from "@/app/app/brand/actions";
import {
  isAllowedLogoType,
  MAX_LOGO_BYTES,
} from "@/lib/brand-kit";

// The brand-kit logo upload widget (Client, T5-BrandKit) — mirrors B2's footage
// upload widget. Flow: client-validate the image → presignBrandKitLogoUpload (server
// signs an R2 PUT) → the BROWSER PUTs the file DIRECTLY to R2 (bytes never transit the
// server) → on success, preview the real image and surface the object key so the
// editor's Save persists logoAssetUrl. NO new dependency (reuses B2's R2 path).
//
// HONEST DISPLAY (FR-005): a real logo shows as an <img>; absent shows "no logo yet —
// upload one"; an invalid/failed upload shows an honest inline error and preserves the
// prior state. NEVER a broken image.

export function BrandKitLogoUpload({
  initialLogoUrl,
  onUploaded,
}: {
  initialLogoUrl: string | null;
  onUploaded: (key: string, previewUrl: string) => void;
}) {
  const [displayUrl, setDisplayUrl] = useState<string | null>(initialLogoUrl);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file || pending) return;

    setError(null);
    if (!isAllowedLogoType(file.type)) {
      setError("Use a PNG, JPEG, SVG, or WebP image.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_LOGO_BYTES) {
      setError("That image is too large (max 5 MB).");
      return;
    }

    setPending(true);
    try {
      const presigned = await presignBrandKitLogoUpload({
        contentType: file.type,
        sizeBytes: file.size,
      });
      if (presigned.status !== "ok") {
        setError(
          presigned.status === "invalid"
            ? presigned.reason
            : "Couldn’t start the upload — try again.",
        );
        return;
      }

      const put = await fetch(presigned.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!put.ok) {
        setError("The upload didn’t complete — try again.");
        return;
      }

      // The preview is the real uploaded file (object URL); the persisted R2 URL is
      // resolved server-side on Save. Both are the same real image.
      const previewUrl = URL.createObjectURL(file);
      setDisplayUrl(previewUrl);
      onUploaded(presigned.key, previewUrl);
    } catch {
      setError("The upload didn’t complete — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="font-ui text-label uppercase tracking-wide text-ink-3">
        Logo
      </span>

      <div className="flex items-center gap-4">
        <div className="flex size-24 items-center justify-center overflow-hidden rounded-clip border border-hairline bg-card">
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt="Brand logo"
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="flex flex-col items-center gap-1 px-2 text-center text-ink-3">
              <ImagePlus className="size-6" strokeWidth={1.5} aria-hidden />
              <span className="font-ui text-body-sm">No logo yet</span>
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            aria-busy={pending}
            className="inline-flex items-center gap-2 rounded-control border border-rule bg-card px-4 py-2 font-ui text-body-sm font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload className="size-4" strokeWidth={1.5} aria-hidden />
            {pending
              ? "Uploading…"
              : displayUrl
                ? "Replace logo"
                : "Upload a logo"}
          </button>
          <span className="font-ui text-body-sm text-ink-3">
            PNG, JPEG, SVG, or WebP · up to 5 MB
          </span>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_ACCEPT}
          onChange={onPick}
          className="sr-only"
          aria-hidden
          tabIndex={-1}
        />
      </div>

      {error && (
        <p className="font-ui text-body-sm text-danger" role="status" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}

const ALLOWED_ACCEPT = "image/png,image/jpeg,image/svg+xml,image/webp";
