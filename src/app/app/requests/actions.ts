"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  createCaptureRequest,
  getBrandKit,
  getLinkSourceId,
  insertRequestTemplate,
  recordSend,
} from "@/db/queries";
import { getCurrentWorkspace } from "@/lib/session";
import { sendCaptureRequestEmail } from "@/lib/resend";
import {
  type CreateAndSendInput,
  type CreateAndSendResult,
  type SaveTemplateInput,
  type SaveTemplateResult,
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

// saveTemplate (US3, ref 06) — persist a reusable request template for the current workspace.
// Only `manual_link` is wired this slice; automated triggers are honest "coming" states in the
// builder and are REJECTED here so they can never persist as if wired (D5 / P-XIII). Saving a
// template fires nothing — the automation bridge is deferred.
export async function saveTemplate(
  input: SaveTemplateInput,
): Promise<SaveTemplateResult> {
  const name = input.name.trim();
  const prompt = input.prompt.trim();
  const consentLine = input.consentLine.trim();
  if (!name || !prompt) {
    return { status: "invalid", reason: "Pick a prompt for the request." };
  }
  if (!consentLine) {
    return { status: "invalid", reason: "The consent line can't be empty." };
  }
  if (input.triggerType !== "manual_link") {
    return {
      status: "invalid",
      reason: "Automatic triggers are coming soon — save a Manual link template for now.",
    };
  }

  const ws = await getCurrentWorkspace();
  const { id } = await insertRequestTemplate({
    workspaceId: ws.id,
    name,
    prompt,
    triggerType: "manual_link",
    deliveryChannel: input.deliveryChannel,
    sendTiming: input.sendTiming ?? null,
    consentLine,
    consentVersion: input.consentVersion,
  });
  revalidatePath("/app/requests");
  return { status: "ok", templateId: id };
}
