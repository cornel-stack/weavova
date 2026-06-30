import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

// ffmpeg media normalization (D6). The ffmpeg BINARY is installed in the worker image
// (apt-get) — it is a HOST/worker dependency, NEVER an app dependency. We shell out via
// child_process (no fluent-ffmpeg dep needed); the binary is deterministic given the
// same args + input, so a retry produces a byte-equivalent output written to the SAME
// deterministic key.
//
// Railway's free tier has ~1GB ephemeral storage — every call works in a fresh mkdtemp
// dir and the caller cleans it in a finally (see media-captured.ts), so scratch never
// accumulates.

export interface NormalizeResult {
  body: Uint8Array;
  contentType: string;
  // the file extension for the deterministic output key (mp4 / jpg)
  ext: "mp4" | "jpg";
}

export type NormalizableType = "video" | "photo";

// Normalize `input` bytes for `proofType`. Returns the normalized bytes + content type.
// Works entirely within a private temp dir which the caller removes afterwards.
export async function normalizeMedia(
  proofType: NormalizableType,
  input: Uint8Array,
): Promise<NormalizeResult> {
  const dir = await mkdtemp(join(tmpdir(), "weavova-normalize-"));
  try {
    if (proofType === "video") {
      const inPath = join(dir, "in");
      const outPath = join(dir, "out.mp4");
      await writeFile(inPath, input);
      // Cap the LONG edge at 1920 (≤1080p), preserve aspect (even dims via -2), re-encode
      // H.264 + AAC, faststart for progressive playback. ffmpeg auto-rotates by default
      // when re-encoding (the display-matrix rotation is BAKED into the pixels); we then
      // strip any residual rotate metadata so downstream players don't double-rotate.
      await run(
        "ffmpeg",
        [
          "-y",
          "-i",
          inPath,
          "-vf",
          "scale='if(gt(iw,ih),min(iw,1920),-2)':'if(gt(iw,ih),-2,min(ih,1920))'",
          "-c:v",
          "libx264",
          "-preset",
          "medium",
          "-crf",
          "23",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-movflags",
          "+faststart",
          "-metadata:s:v:0",
          "rotate=0",
          outPath,
        ],
        { maxBuffer: 1024 * 1024 * 16 },
      );
      const body = new Uint8Array(await readFile(outPath));
      return { body, contentType: "video/mp4", ext: "mp4" };
    }

    // photo — cap the long edge at 2048, re-encode JPEG (strip metadata via re-encode).
    const inPath = join(dir, "in");
    const outPath = join(dir, "out.jpg");
    await writeFile(inPath, input);
    await run(
      "ffmpeg",
      [
        "-y",
        "-i",
        inPath,
        "-vf",
        "scale='if(gt(iw,ih),min(iw,2048),-2)':'if(gt(iw,ih),-2,min(ih,2048))'",
        "-q:v",
        "3",
        outPath,
      ],
      { maxBuffer: 1024 * 1024 * 16 },
    );
    const body = new Uint8Array(await readFile(outPath));
    return { body, contentType: "image/jpeg", ext: "jpg" };
  } finally {
    // Always remove the scratch dir — bounded ephemeral storage (Railway free = ~1GB).
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
