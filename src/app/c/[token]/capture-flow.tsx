"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Check,
  ChevronLeft,
  Heart,
  Image as ImageIcon,
  type LucideIcon,
  Mic,
  Pencil,
  RotateCcw,
  Video,
  X,
} from "lucide-react";
import { contrastOn, isHexColor } from "@/lib/brand-kit";
import type { NameDisplay } from "@/lib/consent";
import {
  CAPTURE_ALLOWED_AUDIO_TYPES,
  CAPTURE_ALLOWED_VIDEO_TYPES,
  type CaptureRequestView,
} from "@/lib/capture";
import { presignCaptureUpload, submitCapture } from "./actions";

// The public capture flow (T7.2 — a faithful PORT of design-reference/Weavova/Capture/).
// Client state machine. Wires TEXT (01→07→04→05→06) and VIDEO (01→02→03→04→05→06).
// VIDEO: MediaRecorder records on-device → review (retake/use; No-Editor — record→review
// only) → presigned-PUT direct to R2 (bytes never transit Vercel) → the SAME atomic send.
// The recorded clip is reviewed in-page (the customer's own blob); there is NO player on a
// stored proof — that's the T8 seam in proof-detail. Photo/audio stay "coming" (P-XIII).
// Layout matches the refs: top-left brand mark + back-chevron, bottom-pinned primary CTAs,
// the full-bleed dark recorder (02), and an AFFIRMATIVE consent checkbox that gates Send
// (04 — P-VII). The page wears the workspace BRAND COLOUR (documented P-IV exception for
// this brand-owned surface); "powered by Weavova" is the only Weavova mark. No verified stamp.

type Screen =
  | "prompt"
  | "record"
  | "audio" // T7.2b — audio recorder (mic + timer) → review
  | "review"
  | "write"
  | "consent"
  | "sending"
  | "thanks";

// The face-bearing media paths — the consent "Show my face" control applies to these
// (a video or a photo may show a face); text/audio have no face.
type CapturePath = "text" | "video" | "photo" | "audio";
function isFaceBearing(path: CapturePath): boolean {
  return path === "video" || path === "photo";
}

const NAME_RANK: Record<NameDisplay, number> = {
  full: 0,
  first_initial: 1,
  anonymous: 2,
};
const NAME_OPTIONS: { value: NameDisplay; label: string }[] = [
  { value: "full", label: "My full name" },
  { value: "first_initial", label: "First name + initial" },
  { value: "anonymous", label: "Keep me anonymous" },
];

// Pick a MediaRecorder mime the browser supports; normalise (strip codecs) for signing.
function pickVideoType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of CAPTURE_ALLOWED_VIDEO_TYPES) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return null;
}
function pickAudioType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of CAPTURE_ALLOWED_AUDIO_TYPES) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return null;
}
function baseType(mime: string): string {
  return mime.split(";")[0];
}
function firstName(name: string | null): string | null {
  if (!name) return null;
  return name.trim().split(/\s+/)[0] || null;
}

export function CaptureFlow({ request }: { request: CaptureRequestView }) {
  const [screen, setScreen] = useState<Screen>("prompt");
  const [text, setText] = useState("");
  const [nameDisplay, setNameDisplay] = useState<NameDisplay>(
    request.display.nameDisplay,
  );
  const [showFace, setShowFace] = useState<boolean>(request.display.showFace);
  const [consented, setConsented] = useState(false); // 04 — affirmative gate (P-VII)
  const [path, setPath] = useState<CapturePath>("text");
  const [clip, setClip] = useState<{ blob: Blob; url: string } | null>(null);
  const [mediaKey, setMediaKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const brandColor = isHexColor(request.brand?.brandColor ?? "")
    ? request.brand!.brandColor
    : "#1C1714";
  const onBrand = contrastOn(brandColor);
  const fname = firstName(request.customerName);
  const ws = request.workspaceName;
  const primary = { backgroundColor: brandColor, color: onBrand } as const;

  // text/video/audio route here; photo is picker-driven from the prompt (opens the OS
  // camera/gallery directly → review), so it never passes through choosePath.
  function choosePath(p: "text" | "video" | "audio") {
    setError(null);
    setPath(p);
    if (p === "text") setScreen("write");
    else if (p === "video") setScreen("record");
    else setScreen("audio");
  }

  function onClipReady(blob: Blob) {
    setClip({ blob, url: URL.createObjectURL(blob) });
    setScreen("review");
  }
  function retake() {
    if (clip) URL.revokeObjectURL(clip.url);
    setClip(null);
    setMediaKey(null);
    setScreen("record");
  }

  // Upload the reviewed clip to R2 (presign → PUT), then advance to consent.
  function useClip() {
    if (!clip) return;
    setError(null);
    setScreen("sending"); // brief "uploading" via the sending seam
    startTransition(async () => {
      // The blob's own type (file input → image/*, MediaRecorder → audio/video); fall back
      // per path if a browser reports an empty type.
      const fallbackType =
        path === "photo" ? "image/jpeg" : path === "audio" ? "audio/webm" : "video/webm";
      const contentType = baseType(clip.blob.type) || fallbackType;
      const signed = await presignCaptureUpload({
        token: request.token,
        contentType,
        sizeBytes: clip.blob.size,
      });
      if (signed.status !== "ok") {
        setError(
          signed.status === "invalid"
            ? signed.reason
            : signed.status === "closed"
              ? `This link is no longer open. Ask ${ws} for a new one.`
              : "Upload failed. Try again.",
        );
        setScreen("review");
        return;
      }
      try {
        const put = await fetch(signed.uploadUrl, {
          method: "PUT",
          body: clip.blob,
          headers: { "content-type": contentType },
        });
        if (!put.ok) throw new Error("PUT failed");
      } catch {
        setError("Upload failed. Check your connection and try again.");
        setScreen("review");
        return;
      }
      setMediaKey(signed.key);
      setScreen("consent");
    });
  }

  function send() {
    setError(null);
    setScreen("sending");
    startTransition(async () => {
      const res = await submitCapture({
        token: request.token,
        path,
        text: path === "text" ? text : undefined,
        // any media path (video/photo/audio) sends the uploaded KEY.
        mediaKey: path !== "text" ? (mediaKey ?? undefined) : undefined,
        // face-bearing media (video/photo) → send name + face; text/audio → name only.
        displayOverride: isFaceBearing(path)
          ? { nameDisplay, showFace }
          : { nameDisplay },
      });
      // On error, return to the last editable screen: text → write; media → consent.
      const backScreen: Screen = path === "text" ? "write" : "consent";
      if (res.status === "ok") {
        setScreen("thanks");
      } else if (res.status === "invalid") {
        setError(res.reason);
        setScreen(backScreen);
      } else {
        setError(
          res.status === "error"
            ? `We couldn't save that just now. Ask ${ws} for a fresh link.`
            : `This link is no longer open. Ask ${ws} for a new one.`,
        );
        setScreen(backScreen);
      }
    });
  }

  // ── PORT: 02 _ Recording — full-bleed, outside the paper frame ───────────────
  if (screen === "record") {
    return (
      <RecordScreen
        primary={primary}
        brand={{ logoUrl: request.brand?.logoAssetUrl ?? null, ws }}
        onClip={onClipReady}
        onCancel={() => setScreen("prompt")}
        onWriteInstead={() => choosePath("text")}
      />
    );
  }

  // ── T7.2b: 02/03 pattern, AUDIO treatment (mic + timer, no video preview) → review ──
  if (screen === "audio") {
    return (
      <AudioRecordScreen
        primary={primary}
        onClip={onClipReady}
        onCancel={() => setScreen("prompt")}
        onWriteInstead={() => choosePath("text")}
      />
    );
  }

  // Top-left back-chevron target (04/07 use it; the chevron replaces the bottom "Back").
  const headerBack =
    screen === "write"
      ? () => setScreen("prompt")
      : screen === "consent"
        ? () => setScreen(path === "text" ? "write" : "review")
        : null;
  const showHeader =
    screen === "prompt" || screen === "write" || screen === "consent";

  return (
    <main className="flex min-h-dvh flex-col items-center bg-paper px-6 py-8">
      <div className="flex w-full max-w-[440px] flex-1 flex-col">
        {showHeader && (
          <header className="flex items-center gap-2 py-4">
            {headerBack && (
              <button
                type="button"
                onClick={headerBack}
                aria-label="Back"
                className="-ml-2 flex size-9 items-center justify-center rounded-pill text-ink-2 transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
            )}
            {request.brand?.logoAssetUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={request.brand.logoAssetUrl}
                alt={ws}
                className="h-10 max-w-[160px] object-contain"
              />
            ) : (
              <span
                className="flex size-10 items-center justify-center rounded-control font-display text-display-xs"
                style={primary}
                aria-hidden
              >
                {ws.charAt(0)}
              </span>
            )}
          </header>
        )}

        <div className="flex flex-1 flex-col">
          {/* ── PORT: 01 _ Prompt ───────────────────────────────────────── */}
          {screen === "prompt" && (
            <section className="flex flex-1 flex-col text-center">
              <div className="pt-6">
                <h1 className="font-display text-display-lg text-ink">
                  {fname ? `How was it, ${fname}?` : "How was it?"}
                </h1>
                <p className="mt-3 font-ui text-body text-ink-2">
                  A few honest words is all it takes. Takes about 20 seconds.
                </p>
              </div>
              <div className="mt-auto pt-8">
                <button
                  type="button"
                  onClick={() => choosePath("video")}
                  style={primary}
                  className="flex w-full items-center justify-center gap-2.5 rounded-control px-5 py-4 font-ui text-body font-medium transition-opacity duration-200 ease-pressroom hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <Video className="size-5" aria-hidden />
                  Record a quick video
                </button>
                {/* the three quiet options; photo/audio carry an honest "soon" (P-XIII) */}
                <div className="mt-4 grid grid-cols-3 gap-1">
                  <PromptIconOption
                    icon={Pencil}
                    label="Write it"
                    wired={request.wiredPaths.includes("text")}
                    onClick={() => choosePath("text")}
                  />
                  {/* Photo opens the OS camera/gallery picker directly (native — no intake
                      screen); the chosen file goes straight to review (screen 08). */}
                  <label className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-2 text-left transition-colors duration-200 ease-pressroom hover:bg-sunken focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
                    <ImageIcon className="size-5 shrink-0 text-ink-2" aria-hidden />
                    <span className="font-ui text-body-sm text-ink-2">Add a photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setError(null);
                          setPath("photo");
                          onClipReady(file);
                        }
                      }}
                    />
                  </label>
                  <PromptIconOption
                    icon={Mic}
                    label="Record audio"
                    wired={request.wiredPaths.includes("audio")}
                    onClick={() => choosePath("audio")}
                  />
                </div>
              </div>
            </section>
          )}

          {/* ── PORT: 03 _ Review ───────────────────────────────────────── */}
          {screen === "review" && clip && (
            <section className="flex flex-1 flex-col">
              <div className="pt-2">
                <h1 className="font-display text-display-md text-ink">
                  Looks good?
                </h1>
                <p className="mt-2 font-ui text-body-sm text-ink-3">
                  Not sent yet &mdash; you can retake.
                </p>
              </div>
              {/* the customer reviews their OWN just-captured media (in-memory) — not a
                  stored-proof player. video → <video>; photo (08) → <img>; audio → <audio>. */}
              <div className="flex flex-1 items-center py-5">
                {path === "photo" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={clip.url}
                    alt="Your photo"
                    className="aspect-[3/4] w-full rounded-clip bg-paper object-contain"
                  />
                ) : path === "audio" ? (
                  <div className="flex w-full flex-col items-center gap-5 rounded-clip border border-hairline bg-card py-10">
                    <span
                      className="flex size-16 items-center justify-center rounded-pill"
                      style={primary}
                      aria-hidden
                    >
                      <Mic className="size-7" />
                    </span>
                    <audio src={clip.url} controls className="w-[85%]" />
                  </div>
                ) : (
                  <video
                    src={clip.url}
                    data-theme="ink"
                    controls
                    playsInline
                    className="aspect-[3/4] w-full rounded-clip bg-paper object-contain"
                  />
                )}
              </div>
              {error && (
                <p role="alert" className="mb-3 font-ui text-body-sm text-danger">
                  {error}
                </p>
              )}
              <div className="mt-auto">
                <button
                  type="button"
                  onClick={useClip}
                  style={primary}
                  className="flex w-full items-center justify-center gap-2 rounded-control px-5 py-3.5 font-ui text-body font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  Use this
                  <Check className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={retake}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-control border border-rule bg-card px-5 py-3 font-ui text-body-sm font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <RotateCcw className="size-4" aria-hidden />
                  Retake
                </button>
              </div>
            </section>
          )}

          {/* ── PORT: 07 _ Write it ─────────────────────────────────────── */}
          {screen === "write" && (
            <section className="flex flex-1 flex-col">
              <h1 className="pt-2 font-display text-display-md text-ink">
                In your own words &mdash;
              </h1>
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What stood out? What would you tell a friend?"
                className="mt-5 min-h-[160px] w-full flex-1 resize-none rounded-clip border border-rule bg-card px-4 py-3 font-display text-quote text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              />
              {error && (
                <p role="alert" className="mt-3 font-ui text-body-sm text-danger">
                  {error}
                </p>
              )}
              <div className="mt-auto pt-6">
                <button
                  type="button"
                  disabled={text.trim().length === 0}
                  onClick={() => {
                    setError(null);
                    setScreen("consent");
                  }}
                  style={primary}
                  className="flex w-full items-center justify-center gap-2 rounded-control px-5 py-3.5 font-ui text-body font-medium transition-opacity duration-200 ease-pressroom disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  Use this
                  <Check className="size-4" aria-hidden />
                </button>
              </div>
            </section>
          )}

          {/* ── PORT: 04 _ Consent ──────────────────────────────────────── */}
          {screen === "consent" && (
            <section className="flex flex-1 flex-col">
              <h1 className="pt-2 text-center font-display text-display-md text-ink">
                One last thing.
              </h1>

              {/* affirmative consent — an UNBUNDLED tick that gates Send (P-VII). */}
              <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-clip border border-rule bg-card px-4 py-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
                <input
                  type="checkbox"
                  className="mt-1 size-5 shrink-0 accent-ink"
                  checked={consented}
                  onChange={(e) => setConsented(e.target.checked)}
                />
                <span className="font-display text-quote text-ink">
                  I&rsquo;m happy for {ws} to share this in their marketing.
                </span>
              </label>

              <fieldset className="mt-6">
                <legend className="font-ui text-label uppercase tracking-wide text-ink-3">
                  How you&rsquo;ll appear
                </legend>
                <div className="mt-3 flex flex-col gap-2">
                  {NAME_OPTIONS.map((opt) => {
                    const allowed =
                      NAME_RANK[opt.value] >=
                      NAME_RANK[request.display.nameDisplay];
                    return (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-3 rounded-control border px-4 py-2.5 font-ui text-body-sm ${
                          nameDisplay === opt.value
                            ? "border-ink bg-card text-ink"
                            : "border-hairline text-ink-2"
                        } ${allowed ? "cursor-pointer" : "cursor-not-allowed opacity-40"}`}
                      >
                        <input
                          type="radio"
                          name="nameDisplay"
                          className="accent-ink"
                          checked={nameDisplay === opt.value}
                          disabled={!allowed}
                          onChange={() => setNameDisplay(opt.value)}
                        />
                        {opt.label}
                        {!allowed && (
                          <span className="ml-auto font-ui text-label text-ink-3">
                            set by {ws}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>

                {/* face-bearing media (video/photo) → the show-face control (more-private-
                    only: if the workspace default hides the face, the customer can't re-show
                    it). Text/audio have no face, so this is omitted there. */}
                {isFaceBearing(path) && (
                  <label
                    className={`mt-3 flex items-center gap-3 rounded-control border px-4 py-2.5 font-ui text-body-sm ${
                      request.display.showFace
                        ? "cursor-pointer border-hairline text-ink"
                        : "cursor-not-allowed border-hairline opacity-40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-ink"
                      checked={showFace}
                      disabled={!request.display.showFace}
                      onChange={(e) => setShowFace(e.target.checked)}
                    />
                    Show my face
                    {!request.display.showFace && (
                      <span className="ml-auto font-ui text-label text-ink-3">
                        kept private
                      </span>
                    )}
                  </label>
                )}
              </fieldset>

              <FullTerms workspaceName={ws} />

              <p className="mt-4 font-ui text-body-sm text-ink-3">
                Changed your mind later? Ask {ws} and they&rsquo;ll take it down.
              </p>

              {error && (
                <p role="alert" className="mt-3 font-ui text-body-sm text-danger">
                  {error}
                </p>
              )}

              <div className="mt-auto pt-6">
                <button
                  type="button"
                  onClick={send}
                  disabled={!consented}
                  style={primary}
                  className="w-full rounded-control px-5 py-3.5 font-ui text-body font-medium transition-opacity duration-200 ease-pressroom disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  Send to {ws}
                </button>
              </div>
            </section>
          )}

          {/* ── PORT: 05 _ Sending ──────────────────────────────────────── */}
          {screen === "sending" && (
            <section
              className="flex flex-1 flex-col justify-center text-center"
              aria-live="polite"
            >
              <p className="font-display text-display-md text-ink">
                {pending ? "Sending…" : "Almost there…"}
              </p>
              <p className="mt-3 font-ui text-body-sm text-ink-3">One moment.</p>
            </section>
          )}

          {/* ── PORT: 06 _ Thank-you ────────────────────────────────────── */}
          {screen === "thanks" && (
            <section className="flex flex-1 flex-col justify-center text-center">
              <span
                className="mx-auto mb-6 flex size-16 items-center justify-center rounded-pill border"
                style={{ borderColor: brandColor, color: brandColor }}
                aria-hidden
              >
                <Heart className="size-7" strokeWidth={1.5} />
              </span>
              <h1 className="font-display text-display-lg text-ink">
                {fname ? `Thank you, ${fname}.` : "Thank you."}
              </h1>
              <p className="mt-4 font-display text-quote italic text-ink-2">
                Your words mean a lot to us. &mdash; {ws}
              </p>
            </section>
          )}

        </div>

        <footer className="py-4 text-center">
          <span className="font-ui text-label uppercase tracking-wide text-ink-3">
            powered by Weavova
          </span>
        </footer>
      </div>
    </main>
  );
}

// ── PORT: 02 _ Recording — MediaRecorder on-device + upload fallback ──────────
// Live camera preview + record/stop, ported as the immersive full-bleed dark screen
// (X top-left, centered timer pill, the circular record control). The capture LOGIC is
// unchanged from Increment 2 — getUserMedia/MediaRecorder/stream handling/onstop all as
// before; only the visual framing changed. If getUserMedia/MediaRecorder is unavailable
// or permission is denied, falls back to a file upload (also the seam the polished
// screen-09 "camera blocked" plugs into at T7.2b). Records → review only (No-Editor).
function RecordScreen({
  primary,
  brand,
  onClip,
  onCancel,
  onWriteInstead,
}: {
  primary: { backgroundColor: string; color: string };
  brand: { logoUrl: string | null; ws: string };
  onClip: (blob: Blob) => void;
  onCancel: () => void;
  onWriteInstead: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const mime = pickVideoType();
    if (mime == null || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setFallback(true);
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => {
        if (!cancelled) setFallback(true); // permission denied / no camera → fallback
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // recording timer
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  function start() {
    const stream = streamRef.current;
    const mime = pickVideoType();
    if (!stream || !mime) {
      setFallback(true);
      return;
    }
    chunksRef.current = [];
    const rec = new MediaRecorder(stream, { mimeType: mime });
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onClip(blob);
    };
    recorderRef.current = rec;
    rec.start();
    setElapsed(0);
    setRecording(true);
  }
  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  if (fallback) {
    // PORT: 09 _ Camera blocked — the polished getUserMedia-unavailable fallback. Verbatim
    // copy, brand-marked header, upload-from-gallery + write-instead (both real). The capture
    // fallback BEHAVIOR is unchanged from the spine; this is the designed surface over it.
    return (
      <main className="flex min-h-dvh flex-col items-center bg-paper px-6 py-8">
        <div className="flex w-full max-w-[440px] flex-1 flex-col">
          <header className="flex items-center gap-2 py-4">
            <button
              type="button"
              onClick={onCancel}
              aria-label="Back"
              className="-ml-2 flex size-9 items-center justify-center rounded-pill text-ink-2 transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logoUrl}
                alt={brand.ws}
                className="h-10 max-w-[160px] object-contain"
              />
            ) : (
              <span
                className="flex size-10 items-center justify-center rounded-control font-display text-display-xs"
                style={primary}
                aria-hidden
              >
                {brand.ws.charAt(0)}
              </span>
            )}
          </header>
          <section className="flex flex-1 flex-col text-center">
            <div className="pt-6">
              <h1 className="font-display text-display-md text-ink">
                No camera? No problem.
              </h1>
              <p className="mt-3 font-ui text-body text-ink-2">
                We couldn&rsquo;t reach your camera. You can upload a clip from your
                gallery, or just write a few words instead.
              </p>
            </div>
            <div className="mt-auto pt-8">
              <label
                style={primary}
                className="block w-full cursor-pointer rounded-control px-5 py-4 text-center font-ui text-body font-medium focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink"
              >
                Upload from gallery
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onClip(file);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={onWriteInstead}
                className="mt-3 w-full rounded-control border border-rule bg-card px-5 py-3 font-ui text-body-sm font-medium text-ink hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Write it instead
              </button>
            </div>
          </section>
          <footer className="py-4 text-center">
            <span className="font-ui text-label uppercase tracking-wide text-ink-3">
              powered by Weavova
            </span>
          </footer>
        </div>
      </main>
    );
  }

  // The recorder is an immersive camera surface — ALWAYS dark in both app themes (like any
  // phone camera). data-theme="ink" re-scopes the Pressroom tokens to their dark values for
  // this subtree, so the semantic tokens (paper/card/ink) stay dark even in Daylight.
  return (
    <main data-theme="ink" className="relative flex min-h-dvh flex-col bg-paper">
      {/* the customer's OWN live camera (allowed) — fills the frame */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 size-full object-cover"
      />
      <button
        type="button"
        onClick={onCancel}
        aria-label="Close"
        className="absolute left-5 top-5 z-10 flex size-10 items-center justify-center rounded-pill bg-card/70 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <X className="size-5" aria-hidden />
      </button>
      {recording && (
        <span className="absolute left-1/2 top-6 z-10 flex -translate-x-1/2 items-center gap-2 rounded-pill bg-card/70 px-3 py-1 font-mono text-mono-sm text-ink">
          <span className="size-2 rounded-pill bg-danger" aria-hidden />
          {mmss}
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-5 p-8">
        <span className="rounded-pill bg-card/70 px-3 py-1 font-ui text-body-sm text-ink">
          about 20 seconds
        </span>
        <button
          type="button"
          onClick={recording ? stop : start}
          aria-label={recording ? "Stop recording" : "Start recording"}
          className="flex size-[72px] items-center justify-center rounded-pill border-4 border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <span
            className={
              recording
                ? "size-7 rounded-[6px] bg-danger"
                : "size-14 rounded-pill bg-danger"
            }
            aria-hidden
          />
        </button>
      </div>
    </main>
  );
}

// ── T7.2b: AUDIO recorder — the 02/03 recording/review pattern, audio treatment ──────
// Mirrors RecordScreen's capture lifecycle (getUserMedia → MediaRecorder → onstop → onClip)
// but AUDIO-ONLY: no video preview, a paper-framed screen with a big mic + a running timer +
// the circular record control. Falls back to a file upload if mic/MediaRecorder is
// unavailable/denied (no dead end). Records → review only (No-Editor).
function AudioRecordScreen({
  primary,
  onClip,
  onCancel,
  onWriteInstead,
}: {
  primary: { backgroundColor: string; color: string };
  onClip: (blob: Blob) => void;
  onCancel: () => void;
  onWriteInstead: () => void;
}) {
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [ready, setReady] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const mime = pickAudioType();
    if (
      mime == null ||
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setFallback(true);
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFallback(true); // permission denied / no mic → fallback
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  function start() {
    const stream = streamRef.current;
    const mime = pickAudioType();
    if (!stream || !mime) {
      setFallback(true);
      return;
    }
    chunksRef.current = [];
    const rec = new MediaRecorder(stream, { mimeType: mime });
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      onClip(blob);
    };
    recorderRef.current = rec;
    rec.start();
    setElapsed(0);
    setRecording(true);
  }
  function stop() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <main className="flex min-h-dvh flex-col items-center bg-paper px-6 py-8">
      <div className="flex w-full max-w-[440px] flex-1 flex-col">
        <header className="flex items-center py-4">
          <button
            type="button"
            onClick={onCancel}
            aria-label="Back"
            className="-ml-2 flex size-9 items-center justify-center rounded-pill text-ink-2 transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
        </header>

        {fallback ? (
          <section className="flex flex-1 flex-col text-center">
            <div className="pt-6">
              <h1 className="font-display text-display-md text-ink">
                No microphone? No problem.
              </h1>
              <p className="mt-3 font-ui text-body text-ink-2">
                Upload an audio clip from your device, or write a few words instead.
              </p>
            </div>
            <div className="mt-auto pt-8">
              <label
                style={primary}
                className="block w-full cursor-pointer rounded-control px-5 py-4 text-center font-ui text-body font-medium focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink"
              >
                Upload audio
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onClip(file);
                  }}
                />
              </label>
              <button
                type="button"
                onClick={onWriteInstead}
                className="mt-3 w-full rounded-control border border-rule bg-card px-5 py-3 font-ui text-body-sm font-medium text-ink hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Write it instead
              </button>
            </div>
          </section>
        ) : (
          <section className="flex flex-1 flex-col items-center text-center">
            <div className="pt-6">
              <h1 className="font-display text-display-md text-ink">
                {recording ? "Listening…" : "Record audio."}
              </h1>
              <p className="mt-3 font-ui text-body text-ink-2">
                A few honest words. Takes about 20 seconds.
              </p>
            </div>

            <span
              className="mt-10 flex size-24 items-center justify-center rounded-pill"
              style={primary}
              aria-hidden
            >
              <Mic className="size-10" />
            </span>
            <span className="mt-6 flex items-center gap-2 rounded-pill bg-sunken px-3 py-1 font-mono text-mono-sm text-ink-2">
              {recording && <span className="size-2 rounded-pill bg-danger" aria-hidden />}
              {mmss}
            </span>

            <div className="mt-auto w-full pt-8">
              <button
                type="button"
                onClick={recording ? stop : start}
                disabled={!ready && !recording}
                aria-label={recording ? "Stop recording" : "Start recording"}
                style={recording ? undefined : primary}
                className={
                  recording
                    ? "flex w-full items-center justify-center gap-2 rounded-control border border-rule bg-card px-5 py-3.5 font-ui text-body font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    : "flex w-full items-center justify-center gap-2 rounded-control px-5 py-3.5 font-ui text-body font-medium transition-opacity duration-200 ease-pressroom hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                }
              >
                {recording ? "Stop" : "Start recording"}
              </button>
              <button
                type="button"
                onClick={onWriteInstead}
                className="mt-3 w-full rounded-control px-5 py-3 font-ui text-body-sm text-ink-3 transition-colors duration-200 ease-pressroom hover:text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Write it instead
              </button>
            </div>
          </section>
        )}

        <footer className="py-4 text-center">
          <span className="font-ui text-label uppercase tracking-wide text-ink-3">
            powered by Weavova
          </span>
        </footer>
      </div>
    </main>
  );
}

function PromptIconOption({
  icon: Icon,
  label,
  wired,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  wired: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-control px-2 py-2 text-left transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <Icon
        className={`size-5 shrink-0 ${wired ? "text-ink-2" : "text-ink-3"}`}
        aria-hidden
      />
      <span className={`font-ui text-body-sm ${wired ? "text-ink-2" : "text-ink-3"}`}>
        {label}
        {!wired && (
          <span className="block font-ui text-label uppercase tracking-wide text-ink-3">
            soon
          </span>
        )}
      </span>
    </button>
  );
}

function FullTerms({ workspaceName }: { workspaceName: string }) {
  return (
    <details className="mt-5 rounded-control border border-hairline bg-card px-4 py-3">
      <summary className="cursor-pointer font-ui text-body-sm font-medium text-ink">
        Read the full terms
      </summary>
      <div className="mt-3 space-y-2 font-ui text-body-sm text-ink-2">
        <p>
          You&rsquo;re giving {workspaceName} permission to use what you share here
          &mdash; your words, and any video, photo, or audio &mdash; in their marketing
          (for example, social posts).
        </p>
        <p>
          You can choose how you appear (your name, or anonymous; your face shown or
          hidden). Your consent is recorded with a date and version, and you can withdraw
          it at any time by asking {workspaceName} &mdash; they&rsquo;ll stop using it and
          take down what they can.
        </p>
        <p>
          {workspaceName} won&rsquo;t change your words. Nothing here is shared with anyone
          else.
        </p>
      </div>
    </details>
  );
}
