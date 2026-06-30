import {
  claimForNormalize,
  getNormalizeTarget,
  markFailed,
  markNormalized,
} from "../db.js";
import { inngest, type MediaCapturedData } from "../inngest.js";
import { normalizeMedia, type NormalizableType } from "../normalize.js";
import { getObject, putObject } from "../r2.js";

// media.captured → normalize. Idempotent + retry-safe under Inngest at-least-once delivery:
//   • Status-gated: act only on captured|normalizing; a duplicate that finds `normalized`
//     no-ops (the claim returns false). Belt-and-braces with the Inngest event-id dedup
//     the app sets (id = "media.captured:<proofId>").
//   • Deterministic output key (capture/{ws}/{proofId}/normalized.{ext}) — a retry
//     overwrites the SAME object, never a duplicate.
//   • Failure → onFailure flips media_status='failed' (after bounded retries); the ORIGINAL
//     mediaUrl is retained and no normalized_media_url is written. Never a crash loop.
export const mediaCaptured = inngest.createFunction(
  {
    id: "media-captured-normalize",
    // bound retries; the final failure routes to onFailure below
    retries: 3,
    onFailure: async ({ event }) => {
      // `event` here is the original triggering event wrapped by Inngest.
      const data = (event?.data?.event?.data ?? {}) as Partial<MediaCapturedData>;
      if (data.proofId) await markFailed(data.proofId);
    },
  },
  { event: "media.captured" },
  async ({ event, step }) => {
    const { proofId, workspaceId, mediaKey, proofType } =
      event.data as MediaCapturedData;

    // Audio is deferred (no audio capture wired yet) and text has no media — nothing to do.
    if (proofType !== "video" && proofType !== "photo") {
      return { proofId, skipped: "non-normalizable-type" };
    }

    // Idempotency gate — claim captured|normalizing → normalizing; a `normalized` proof
    // (a re-delivery) is already done.
    const target = await step.run("claim", async () => {
      const t = await getNormalizeTarget(proofId);
      if (!t) return { act: false as const, reason: "proof-gone" };
      if (t.mediaStatus === "normalized")
        return { act: false as const, reason: "already-normalized" };
      const won = await claimForNormalize(proofId);
      return won
        ? { act: true as const }
        : { act: false as const, reason: "not-claimable" };
    });
    if (!target.act) return { proofId, skipped: target.reason };

    // Download → normalize → upload → mark. One step so an Inngest retry re-runs the whole
    // deterministic pipeline (safe: same input key, same output key). Temp scratch is
    // cleaned inside normalizeMedia's finally.
    const result = await step.run("normalize", async () => {
      const original = await getObject(mediaKey);
      const { body, contentType, ext } = await normalizeMedia(
        proofType as NormalizableType,
        original,
      );
      const normalizedKey = `capture/${workspaceId}/${proofId}/normalized.${ext}`;
      await putObject(normalizedKey, body, contentType);
      await markNormalized(proofId, normalizedKey);
      return { normalizedKey, bytes: body.byteLength };
    });

    return { proofId, normalized: result.normalizedKey };
  },
);
