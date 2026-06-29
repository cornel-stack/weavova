"use server";

import { headers } from "next/headers";
import {
  createCaptureRequest,
  getBrandKit,
  getLinkSourceId,
  recordSend,
} from "@/db/queries";
import { getCurrentWorkspace } from "@/lib/session";
import { sendCaptureRequestEmail } from "@/lib/resend";
import {
  type CreateAndSendInput,
  type CreateAndSendResult,
  looksLikeEmail,
} from "@/lib/requests";

// The T7.3 request actions. AUTHENTICATED + WORKSPACE-SCOPED (NOT token-scoped): every write
// resolves the current workspace via getCurrentWorkspace() and mints into THAT workspace. This
// is the merchant side — the opposite of the public, token-scoped /c/[token] actions.
//
// createAndSendRequest is the loop-closer (US1, ref 23): it mints a capture_request via the
// EXISTING T7.2 primitive (+ the additive customer_email) and sends the /c/[token] link by email
// (Resend) or returns a copyable link. D3 — MINT DURABLY FIRST, send BEST-EFFORT: a Resend
// failure leaves a real, usable request (a request_send row marked `failed`) and is reported
// honestly as "created, not emailed" — NEVER a false "sent". The token model is untouched and the
// public page needs ZERO changes (a merchant-minted request resolves identically to a seeded one).

async function appOrigin(): Promise<string> {
  const fromEnv = process.env.AUTH_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function createAndSendRequest(
  input: CreateAndSendInput,
): Promise<CreateAndSendResult> {
  // Validate the recipient up-front (Email path) — before any mint.
  const recipient = (input.recipientEmail ?? "").trim();
  if (input.channel === "email" && !looksLikeEmail(recipient)) {
    return { status: "invalid", reason: "Enter a valid email address." };
  }

  const ws = await getCurrentWorkspace();
  const linkSourceId = await getLinkSourceId(ws.id);
  if (!linkSourceId) {
    // A genuine workspace-config anomaly (the link source is seeded). Honest, non-throwing.
    return {
      status: "invalid",
      reason: "This workspace can't create capture links yet.",
    };
  }

  // 1. Mint the durable request (the source of truth) via the unchanged T7.2 primitive.
  const { id: requestId, token } = await createCaptureRequest(
    ws.id,
    linkSourceId,
    {
      customerName: input.customerName ?? null,
      customerEmail: input.channel === "email" ? recipient : null,
    },
  );
  const captureUrl = `${await appOrigin()}/c/${token}`;

  // 2a. Link channel — a copyable URL, no email.
  if (input.channel === "link") {
    await recordSend({
      requestId,
      workspaceId: ws.id,
      channel: "link",
      templateId: input.templateId ?? null,
      deliveryStatus: "link_generated",
    });
    return { status: "ok", channel: "link", captureUrl };
  }

  // 2b. Email channel — best-effort Resend send; the request already exists either way.
  const brand = await getBrandKit(ws.id);
  const sent = await sendCaptureRequestEmail({
    to: recipient,
    workspaceName: ws.name,
    brand: brand
      ? { logoAssetUrl: brand.logoAssetUrl, brandColor: brand.brandColor }
      : null,
    captureUrl,
    message: input.message ?? null,
  });

  if (sent.ok) {
    await recordSend({
      requestId,
      workspaceId: ws.id,
      channel: "email",
      templateId: input.templateId ?? null,
      recipientEmail: recipient,
      deliveryStatus: "accepted",
      providerId: sent.providerId ?? null,
    });
    return { status: "ok", channel: "email", captureUrl, delivery: "accepted" };
  }

  // Send failed AFTER the mint — honest: the link is ready; never claim "sent".
  await recordSend({
    requestId,
    workspaceId: ws.id,
    channel: "email",
    templateId: input.templateId ?? null,
    recipientEmail: recipient,
    deliveryStatus: "failed",
  });
  return { status: "sent_failed", captureUrl };
}
