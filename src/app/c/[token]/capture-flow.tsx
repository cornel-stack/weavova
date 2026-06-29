"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { contrastOn, isHexColor } from "@/lib/brand-kit";
import type { NameDisplay } from "@/lib/consent";
import {
  CAPTURE_ALLOWED_VIDEO_TYPES,
  type CaptureProofPath,
  type CaptureRequestView,
} from "@/lib/capture";
import { presignCaptureUpload, submitCapture } from "./actions";

// The public capture flow (T7.2 — a faithful PORT of design-reference/Weavova/Capture/).
// Client state machine. Wires TEXT (01→07→04→05→06) and VIDEO (01→02→03→04→05→06).
// VIDEO: MediaRecorder records on-device → review (retake/use; No-Editor — record→review
// only) → presigned-PUT direct to R2 (bytes never transit Vercel) → the SAME atomic send.
// The recorded clip is reviewed in-page (the customer's own blob); there is NO player on a
// stored proof — that's the T8 seam in proof-detail. Photo/audio stay "coming" (P-XIII).
// The page wears the workspace BRAND COLOUR (documented P-IV exception for this brand-owned
// surface); "powered by Weavova" is the only Weavova mark. No verified stamp.

type Screen =
  | "prompt"
  | "record"
  | "review"
  | "write"
  | "consent"
  | "sending"
  | "thanks"
  | "coming";

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
  const [path, setPath] = useState<"text" | "video">("text");
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

  function choosePath(p: CaptureProofPath) {
    setError(null);
    if (p === "text") {
      setPath("text");
      setScreen("write");
    } else if (p === "video") {
      setPath("video");
      setScreen("record");
    } else {
      setScreen("coming"); // photo/audio — honest coming (T7.2b)
    }
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
      const contentType = baseType(clip.blob.type) || "video/webm";
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
        mediaKey: path === "video" ? (mediaKey ?? undefined) : undefined,
        // video has a face → send name + face; text → name only (no face).
        displayOverride:
          path === "video" ? { nameDisplay, showFace } : { nameDisplay },
      });
      if (res.status === "ok") {
        setScreen("thanks");
      } else if (res.status === "invalid") {
        setError(res.reason);
        setScreen(path === "video" ? "consent" : "write");
      } else {
        setError(
          res.status === "error"
            ? `We couldn't save that just now. Ask ${ws} for a fresh link.`
            : `This link is no longer open. Ask ${ws} for a new one.`,
        );
        setScreen(path === "video" ? "consent" : "write");
      }
    });
  }

  return (
    <main className="flex min-h-dvh flex-col items-center bg-paper px-6 py-10">
      <div className="flex w-full max-w-[440px] flex-1 flex-col">
        <header className="flex justify-center py-4">
          {request.brand?.logoAssetUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={request.brand.logoAssetUrl}
              alt={ws}
              className="h-10 max-w-[180px] object-contain"
            />
          ) : (
            <span
              className="flex size-10 items-center justify-center rounded-pill font-display text-display-xs"
              style={primary}
              aria-hidden
            >
              {ws.charAt(0)}
            </span>
          )}
        </header>

        <div className="flex flex-1 flex-col justify-center py-6">
          {/* ── PORT: 01 _ Prompt ───────────────────────────────────────── */}
          {screen === "prompt" && (
            <section className="text-center">
              <h1 className="font-display text-display-lg text-ink">
                {fname ? `How was it, ${fname}?` : `How was it?`}
              </h1>
              <p className="mt-3 font-ui text-body text-ink-2">
                A few honest words is all it takes. Takes about 20 seconds.
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <PromptOption
                  label="Record a quick video"
                  wired={request.wiredPaths.includes("video")}
                  onClick={() => choosePath("video")}
                  primaryStyle={primary}
                />
                <PromptOption
                  label="Write it"
                  wired={request.wiredPaths.includes("text")}
                  onClick={() => choosePath("text")}
                  primaryStyle={primary}
                />
                <PromptOption
                  label="Add a photo"
                  wired={request.wiredPaths.includes("photo")}
                  onClick={() => choosePath("photo")}
                  primaryStyle={primary}
                />
                <PromptOption
                  label="Record audio"
                  wired={request.wiredPaths.includes("audio")}
                  onClick={() => choosePath("audio")}
                  primaryStyle={primary}
                />
              </div>
            </section>
          )}

          {/* ── PORT: 02 _ Recording ────────────────────────────────────── */}
          {screen === "record" && (
            <RecordScreen
              primary={primary}
              onClip={onClipReady}
              onCancel={() => setScreen("prompt")}
              onWriteInstead={() => choosePath("text")}
            />
          )}

          {/* ── PORT: 03 _ Review ───────────────────────────────────────── */}
          {screen === "review" && clip && (
            <section>
              <h1 className="font-display text-display-md text-ink">
                Looks good?
              </h1>
              <p className="mt-2 font-ui text-body-sm text-ink-3">
                Not sent yet &mdash; you can retake.
              </p>
              {/* the customer reviews their OWN just-recorded clip (in-memory) — not a
                  stored-proof player */}
              <video
                src={clip.url}
                controls
                playsInline
                className="mt-5 aspect-video w-full rounded-clip bg-ink"
              />
              {error && (
                <p role="alert" className="mt-3 font-ui text-body-sm text-danger">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={useClip}
                style={primary}
                className="mt-6 w-full rounded-control px-5 py-3.5 font-ui text-body font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Use this
              </button>
              <button
                type="button"
                onClick={retake}
                className="mt-3 w-full rounded-control border border-rule bg-card px-5 py-3 font-ui text-body-sm font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Retake
              </button>
            </section>
          )}

          {/* ── PORT: 07 _ Write it ─────────────────────────────────────── */}
          {screen === "write" && (
            <section>
              <h1 className="font-display text-display-md text-ink">
                In your own words &mdash;
              </h1>
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                placeholder="What stood out? What would you tell a friend?"
                className="mt-5 w-full resize-none rounded-clip border border-rule bg-card px-4 py-3 font-display text-quote text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              />
              {error && (
                <p role="alert" className="mt-3 font-ui text-body-sm text-danger">
                  {error}
                </p>
              )}
              <button
                type="button"
                disabled={text.trim().length === 0}
                onClick={() => {
                  setError(null);
                  setScreen("consent");
                }}
                style={primary}
                className="mt-6 w-full rounded-control px-5 py-3.5 font-ui text-body font-medium transition-opacity duration-200 ease-pressroom disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Use this
              </button>
              <BackLink onClick={() => setScreen("prompt")} />
            </section>
          )}

          {/* ── PORT: 04 _ Consent ──────────────────────────────────────── */}
          {screen === "consent" && (
            <section>
              <h1 className="font-display text-display-md text-ink">
                One last thing.
              </h1>
              <p className="mt-4 font-ui text-body text-ink">
                I&rsquo;m happy for {ws} to share this in their marketing.
              </p>

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

                {/* video has a FACE → the show-face control (more-private-only: if the
                    workspace default hides the face, the customer can't re-show it). Text
                    has no face, so this is omitted there. */}
                {path === "video" && (
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

              <button
                type="button"
                onClick={send}
                style={primary}
                className="mt-6 w-full rounded-control px-5 py-3.5 font-ui text-body font-medium transition-opacity duration-200 ease-pressroom focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Send to {ws}
              </button>
              <BackLink
                onClick={() => setScreen(path === "video" ? "review" : "write")}
              />
            </section>
          )}

          {/* ── PORT: 05 _ Sending ──────────────────────────────────────── */}
          {screen === "sending" && (
            <section className="text-center" aria-live="polite">
              <p className="font-display text-display-md text-ink">
                {pending ? "Sending…" : "Almost there…"}
              </p>
              <p className="mt-3 font-ui text-body-sm text-ink-3">One moment.</p>
            </section>
          )}

          {/* ── PORT: 06 _ Thank-you ────────────────────────────────────── */}
          {screen === "thanks" && (
            <section className="text-center">
              <h1 className="font-display text-display-lg text-ink">
                {fname ? `Thank you, ${fname}.` : "Thank you."}
              </h1>
              <p className="mt-3 font-ui text-body text-ink-2">
                Your words mean a lot to us.
              </p>
              <p className="mt-6 font-display text-display-xs text-ink">&mdash; {ws}</p>
            </section>
          )}

          {/* honest "coming" state for photo/audio (P-XIII — not a dead control) */}
          {screen === "coming" && (
            <section className="text-center">
              <h1 className="font-display text-display-md text-ink">Coming soon.</h1>
              <p className="mt-3 font-ui text-body text-ink-2">
                Photo and audio capture are on the way. For now, record a quick video or
                write a few words.
              </p>
              <button
                type="button"
                onClick={() => setScreen("prompt")}
                style={primary}
                className="mt-7 w-full rounded-control px-5 py-3.5 font-ui text-body font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Back
              </button>
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
// Live camera preview + record/stop. If getUserMedia/MediaRecorder is unavailable or
// permission is denied, falls back to a file upload (this is also the seam the polished
// screen-09 "camera blocked" plugs into at T7.2b). Records → review only (No-Editor).
function RecordScreen({
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
    // Minimal camera-unavailable fallback (the polished screen-09 is T7.2b).
    return (
      <section className="text-center">
        <h1 className="font-display text-display-md text-ink">No camera? No problem.</h1>
        <p className="mt-3 font-ui text-body text-ink-2">
          Upload a clip from your gallery, or write a few words instead.
        </p>
        <label
          style={primary}
          className="mt-7 block w-full cursor-pointer rounded-control px-5 py-3.5 font-ui text-body font-medium focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink"
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
      </section>
    );
  }

  return (
    <section className="text-center">
      <div className="relative overflow-hidden rounded-clip bg-ink">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="aspect-[3/4] w-full object-cover"
        />
        {recording && (
          <span className="absolute left-3 top-3 flex items-center gap-2 rounded-pill bg-card/90 px-2.5 py-1 font-mono text-mono-sm text-ink">
            <span className="size-2 rounded-pill bg-danger" aria-hidden />
            {mmss}
          </span>
        )}
      </div>
      <p className="mt-4 font-ui text-body-sm text-ink-3">about 20 seconds</p>
      {!recording ? (
        <button
          type="button"
          onClick={start}
          style={primary}
          className="mt-5 w-full rounded-control px-5 py-3.5 font-ui text-body font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Start recording
        </button>
      ) : (
        <button
          type="button"
          onClick={stop}
          className="mt-5 w-full rounded-control border border-rule bg-card px-5 py-3.5 font-ui text-body font-medium text-ink hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Stop
        </button>
      )}
      <BackLink onClick={onCancel} />
    </section>
  );
}

function PromptOption({
  label,
  wired,
  onClick,
  primaryStyle,
}: {
  label: string;
  wired: boolean;
  onClick: () => void;
  primaryStyle: { backgroundColor: string; color: string };
}) {
  if (wired) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={primaryStyle}
        className="w-full rounded-control px-5 py-3.5 font-ui text-body font-medium transition-opacity duration-200 ease-pressroom hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-control border border-hairline bg-card px-5 py-3.5 font-ui text-body text-ink-2 transition-colors duration-200 ease-pressroom hover:border-rule focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {label}
      <span className="rounded-pill bg-sunken px-2 py-0.5 font-ui text-label uppercase tracking-wide text-ink-3">
        soon
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

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 w-full text-center font-ui text-body-sm text-ink-3 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      Back
    </button>
  );
}
