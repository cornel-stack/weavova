// Brand-framed capture-request email — the WORKER mirror of src/lib/resend.ts (T7.3).
// Kept worker-local (a faithful copy, not a cross-boundary import) because the app's
// resend.ts resolves `@/lib/brand-kit` via the Next.js path alias, which tsc does NOT
// rewrite in emitted JS — importing it across the deployable boundary would drag an
// unresolvable runtime specifier into the worker. The SCHEMA is the one genuinely-shared
// file (D9); this email helper is small + stable, so a documented copy is the clean
// boundary. The template (layout, copy, "powered by Weavova", NO tracking pixel) is
// IDENTICAL to T7.3 — if the app's email design changes, mirror it here.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface CaptureRequestEmailInput {
  to: string;
  workspaceName: string;
  brand: { logoAssetUrl?: string | null; brandColor?: string | null } | null;
  captureUrl: string; // absolute https://…/c/<token>
}

export type SendResult =
  | { ok: true; providerId?: string }
  | { ok: false; error: string };

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

// Auto-contrast on a brand colour (mirrors brand-kit.ts contrastOn) — relative luminance.
function contrastOn(hex: string): string {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.5 ? "#1C1714" : "#FFFFFF";
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

export function composeCaptureRequestEmail(input: CaptureRequestEmailInput): {
  subject: string;
  html: string;
} {
  const { workspaceName, brand, captureUrl } = input;
  const brandColor = isHexColor(brand?.brandColor ?? "")
    ? (brand!.brandColor as string)
    : "#1C1714";
  const onBrand = contrastOn(brandColor);
  const safeWs = escapeHtml(workspaceName);

  const header = brand?.logoAssetUrl
    ? `<img src="${escapeAttr(brand.logoAssetUrl)}" alt="${escapeAttr(workspaceName)}" style="height:40px;max-width:180px;object-fit:contain;" />`
    : `<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1C1714;">${safeWs}</div>`;

  const note = `<p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:28px;color:#1C1714;">${safeWs} would love a quick word about your experience.</p>`;

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

// Send via the Resend REST API. Never throws — returns a discriminated result so the
// caller decides the honest state; a failure NEVER reads as "sent".
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
    if (!res.ok) return { ok: false, error: `Resend responded ${res.status}` };
    const body = (await res.json().catch(() => null)) as { id?: string } | null;
    return { ok: true, providerId: body?.id };
  } catch {
    return { ok: false, error: "Could not reach the email service." };
  }
}
