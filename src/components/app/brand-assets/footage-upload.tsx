"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  ALLOWED_UPLOAD_TYPES,
  BRAND_ASSET_KIND_OPTIONS,
  isAllowedUploadType,
  LABEL_MAX_LENGTH,
  MAX_UPLOAD_BYTES,
  type BrandAssetKind,
} from "@/lib/brand-asset";
import {
  createBrandAssetRecord,
  presignBrandAssetUpload,
} from "@/app/app/footage/actions";

// The footage upload widget (Client, T4-B2). Drives the ratified PRESIGNED-PUT
// flow: client pre-validates type/size → presignBrandAssetUpload (server signs) →
// the BROWSER PUTs the file bytes DIRECTLY to R2 (never through the Next.js server)
// → createBrandAssetRecord (server persists the row). Honest state machine:
// idle → uploading → stored | failed. A failed/partial upload shows its TRUE state
// and is retryable; it is never shown as stored (A-11). No editor — this is upload
// only (P-VIII). On success we refresh so the new owned asset appears via the read.

type UploadState =
  | { phase: "idle" }
  | { phase: "uploading" }
  | { phase: "stored"; label: string }
  | { phase: "failed"; reason: string };

const MAX_MB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

export function FootageUpload() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<BrandAssetKind>("product");
  const [label, setLabel] = useState("");
  const [state, setState] = useState<UploadState>({ phase: "idle" });

  const uploading = state.phase === "uploading";

  async function onUpload() {
    if (uploading) return;
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setState({ phase: "failed", reason: "Choose a video file first." });
      return;
    }
    if (label.trim().length === 0) {
      setState({ phase: "failed", reason: "Add a label." });
      return;
    }
    // Client-side pre-validation (the server re-validates + binds the presign).
    if (!isAllowedUploadType(file.type)) {
      setState({
        phase: "failed",
        reason: "That file type isn't supported (use MP4, MOV, or WebM).",
      });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setState({ phase: "failed", reason: `That file is over ${MAX_MB} MB.` });
      return;
    }

    setState({ phase: "uploading" });
    try {
      const presigned = await presignBrandAssetUpload({
        kind,
        label: label.trim(),
        contentType: file.type,
        sizeBytes: file.size,
      });
      if (presigned.status === "invalid") {
        setState({ phase: "failed", reason: presigned.reason });
        return;
      }
      if (presigned.status !== "ok") {
        setState({ phase: "failed", reason: "Couldn't start the upload." });
        return;
      }

      // The browser PUTs the bytes straight to R2 (not through our server).
      const put = await fetch(presigned.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!put.ok) {
        setState({ phase: "failed", reason: "The upload didn't complete." });
        return;
      }

      const recorded = await createBrandAssetRecord({
        kind,
        label: label.trim(),
        key: presigned.key,
      });
      if (recorded.status !== "created") {
        setState({
          phase: "failed",
          reason:
            recorded.status === "invalid"
              ? recorded.reason
              : "Stored the file but couldn't save it. Try again.",
        });
        return;
      }

      setState({ phase: "stored", label: recorded.asset.label });
      setLabel("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch {
      setState({ phase: "failed", reason: "Something went wrong. Try again." });
    }
  }

  return (
    <div className="rounded-clip border border-hairline bg-card p-6 shadow-clip">
      <h2 className="font-ui text-heading-md text-ink">Add footage</h2>
      <p className="mt-1 font-ui text-body-sm text-ink-2">
        Your own product video or b-roll. It&rsquo;s stored once and can be
        attached to any consented proof as supporting context.
      </p>

      <div className="mt-5 flex flex-col gap-5">
        <fieldset>
          <legend className="font-ui text-label uppercase tracking-wide text-ink-3">
            Type
          </legend>
          <div
            className="mt-3 flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="Footage type"
          >
            {BRAND_ASSET_KIND_OPTIONS.map((opt) => {
              const selected = opt.value === kind;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setKind(opt.value)}
                  className={`rounded-control px-3 py-1.5 font-ui text-body-sm font-medium transition-colors duration-200 ease-pressroom focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                    selected
                      ? "bg-ink text-paper"
                      : "border border-rule text-ink hover:bg-sunken"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="footage-label"
            className="font-ui text-label uppercase tracking-wide text-ink-3"
          >
            Label
          </label>
          <input
            id="footage-label"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={LABEL_MAX_LENGTH}
            placeholder="e.g. Candle pour — close up"
            className="rounded-control border border-rule bg-card px-3 py-2 font-ui text-body text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="footage-file"
            className="font-ui text-label uppercase tracking-wide text-ink-3"
          >
            Video file
          </label>
          <input
            id="footage-file"
            ref={fileRef}
            type="file"
            accept={ALLOWED_UPLOAD_TYPES.join(",")}
            className="font-ui text-body-sm text-ink-2 file:mr-3 file:rounded-control file:border file:border-rule file:bg-card file:px-3 file:py-1.5 file:font-ui file:text-body-sm file:font-medium file:text-ink hover:file:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          />
          <p className="font-mono text-mono-sm text-ink-3">
            MP4, MOV, or WebM · up to {MAX_MB} MB
          </p>
        </div>

        <button
          type="button"
          onClick={onUpload}
          disabled={uploading}
          aria-busy={uploading}
          className="inline-flex w-fit items-center justify-center gap-2 rounded-control bg-persimmon px-4 py-2.5 font-ui text-body-sm font-medium text-on-accent transition-colors duration-200 ease-pressroom hover:bg-persimmon-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Upload className="size-4" strokeWidth={1.5} aria-hidden />
          {uploading ? "Uploading…" : "Upload footage"}
        </button>

        <div aria-live="polite" className="min-h-5">
          {state.phase === "stored" && (
            <p className="font-ui text-body-sm text-success">
              Stored &ldquo;{state.label}&rdquo;. It&rsquo;s in your footage
              library below.
            </p>
          )}
          {state.phase === "failed" && (
            <p className="font-ui text-body-sm text-danger" role="alert">
              {state.reason}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
