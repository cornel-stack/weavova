import { contrastOn, isHexColor } from "@/lib/brand-kit";

// ============================================================================
// Resend transactional send (T7.3). SERVER-ONLY by convention (imported only from
// "use server" actions; mirrors src/lib/r2.ts + src/db/client.ts — no `server-only`
// package is added). T6 wires email ONLY through NextAuth's Resend PROVIDER (magic
// links) — there is no reusable client. This thin helper sends arbitrary transactional
// mail via the Resend REST API with `fetch`: NO new dependency (still 11). It reads env
// LAZILY (no import-time access), so the app builds/typechecks without credentials; a
// missing var only throws when a live send is attempted. Reuses AUTH_RESEND_KEY +
// AUTH_EMAIL_FROM (C4). The email is brand-framed, carries the /c/[token] link, and ends
// with "powered by Weavova". NO tracking pixel/links — we never store opens/clicks (P-XIV).
// ============================================================================

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface CaptureRequestEmailInput {
  to: string;
  workspaceName: string;
  brand: { logoAssetUrl?: string | null; brandColor?: string | null } | null;
  captureUrl: string; // absolute https://…/c/<token>
  message?: string | null; // optional merchant note (ref 23) — verbatim, not model-authored
}

export type SendResult =
  | { ok: true; providerId?: string }
  | { ok: false; error: string };

// Compose the brand-framed HTML (inline styles — email clients ignore <style>/Tailwind).
// Persimmon is NOT used here; the CTA wears the workspace BRAND colour (this is the brand's
// outreach, the P-IV brand-owned-surface exception, mirroring the capture page).
export function composeCaptureRequestEmail(input: CaptureRequestEmailInput): {
  subject: string;
  html: string;
} {
  const { workspaceName, brand, captureUrl, message } = input;
  const brandColor = isHexColor(brand?.brandColor ?? "")
    ? (brand!.brandColor as string)
    : "#1C1714";
  const onBrand = contrastOn(brandColor);
  const safeWs = escapeHtml(workspaceName);

  const header = brand?.logoAssetUrl
    ? `<img src="${escapeAttr(brand.logoAssetUrl)}" alt="${escapeAttr(workspaceName)}" style="height:40px;max-width:180px;object-fit:contain;" />`
    : `<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1C1714;">${safeWs}</div>`;

  const note = message
    ? `<p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:28px;color:#1C1714;">${escapeHtml(message)}</p>`
    : `<p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:28px;color:#1C1714;">${safeWs} would love a quick word about your experience.</p>`;

  const html = `<!doctype html><html><body style="margin:0;background:#F4F1E8;padding:32px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1E8;">
    <tr><td align="center">
      <table role="presentation" width="440" cellpadding="0" cellspacing="0" style="width:440px;max-width:440px;background:#FEFDF8;border:1px solid #E4DAC8;border-radius:6px;">
        <tr><td style="padding:28px 28px 8px;">${header}</td></tr>
        <tr><td style="padding:8px 28px 4px;">${note}
          <p style="margin:0 0 24px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:#595046;">It takes about 20 seconds — a few honest words, a quick video, whatever suits you.</p>
          <a href="${escapeAttr(captureUrl)}" style="display:inline-block;background:${brandColor};color:${onBrand};text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;padding:14px 22px;border-radius:8px;">Share your experience</a>
        </td></tr>
        <tr><td style="padding:24px 28px 28px;">
          <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#968B79;">powered by Weavova</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return { subject: `${workspaceName} would love a quick word`, html };
}

// Send via the Resend REST API. Never throws — returns a discriminated result so the caller
// (createAndSendRequest) decides the honest state (D3); a failure NEVER reads as "sent".
export async function sendCaptureRequestEmail(
  input: CaptureRequestEmailInput,
): Promise<SendResult> {
  const apiKey = process.env.AUTH_RESEND_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!apiKey || !from) {
    return { ok: false, error: "Email is not configured." };
  }

  const { subject, html } = composeCaptureRequestEmail(input);
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from, to: input.to, subject, html }),
    });
    if (!res.ok) {
      return { ok: false, error: `Resend responded ${res.status}` };
    }
    const body = (await res.json().catch(() => null)) as { id?: string } | null;
    return { ok: true, providerId: body?.id };
  } catch {
    return { ok: false, error: "Could not reach the email service." };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
