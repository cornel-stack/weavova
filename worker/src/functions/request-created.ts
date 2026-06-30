import {
  getSendContext,
  hasAcceptedSend,
  recordWorkerSend,
} from "../db.js";
import { sendCaptureRequestEmail } from "../email.js";
import { inngest, type RequestCreatedData } from "../inngest.js";

// request.created → orchestrated Resend send. Now RETRY-SAFE: a transient Resend failure
// is retried by Inngest (the webhook mint is durable, so the ask is never lost). Idempotent:
//   • Skips if the request already has an `accepted` send (a retry won't double-send).
//   • Inngest also dedupes on the event id the app sets (forward-compatible).
// The app public base URL builds the absolute /c/<token> link the email points at.
export const requestCreated = inngest.createFunction(
  { id: "request-created-send", retries: 3 },
  { event: "request.created" },
  async ({ event, step }) => {
    const { requestId, workspaceId } = event.data as RequestCreatedData;

    const ctx = await step.run("load-context", async () => {
      if (await hasAcceptedSend(requestId)) return null; // already sent
      return getSendContext(requestId);
    });
    if (!ctx) return { requestId, skipped: "already-sent-or-missing" };
    if (!ctx.customerEmail) return { requestId, skipped: "no-recipient" };

    const base = (process.env.APP_PUBLIC_URL ?? "").replace(/\/+$/, "");
    if (!base) {
      // No public URL configured → cannot build an absolute link. Fail (Inngest retries
      // once configured); we do NOT record a misleading "sent".
      throw new Error("APP_PUBLIC_URL is not set on the worker.");
    }
    const captureUrl = `${base}/c/${ctx.token}`;

    const result = await step.run("send", async () => {
      const send = await sendCaptureRequestEmail({
        to: ctx.customerEmail as string,
        workspaceName: ctx.workspaceName,
        brand: ctx.brand,
        captureUrl,
      });
      await recordWorkerSend({
        requestId,
        workspaceId,
        recipientEmail: ctx.customerEmail as string,
        deliveryStatus: send.ok ? "accepted" : "failed",
        providerId: send.ok ? (send.providerId ?? null) : null,
      });
      return send;
    });

    // A failed send is recorded honestly (above) and thrown so Inngest retries — never a
    // silent "sent".
    if (!result.ok) throw new Error(`Resend failed: ${result.error}`);
    return { requestId, sent: true, providerId: result.providerId ?? null };
  },
);
