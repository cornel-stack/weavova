import { Link2, Mail, Send } from "lucide-react";
import { type TemplateCardView, triggerLabel } from "@/lib/requests";

// PORT: 05 _ Collection requests. The "Saved templates" card grid. Presentational (no client
// state) — each card shows the template's prompt, its trigger, the delivery channel, and a REAL
// "N sent" count (count of request_send rows; P-XIV — never fabricated). The delivery pill is a
// STATUS label (the channel a send uses), not a control. Empty state is honest (P-XIII).

export function RequestsGrid({ templates }: { templates: TemplateCardView[] }) {
  if (templates.length === 0) {
    return (
      <div className="mt-4 rounded-clip border border-hairline bg-card px-6 py-16 text-center">
        <p className="font-display text-display-sm text-ink">No requests yet.</p>
        <p className="mx-auto mt-2 max-w-[42ch] font-ui text-body-sm text-ink-2">
          Save a request template, or ask a customer for proof from any of their
          existing proof.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {templates.map((t) => (
        <TemplateCard key={t.id} template={t} />
      ))}
    </div>
  );
}

function TemplateCard({ template }: { template: TemplateCardView }) {
  return (
    <article className="rounded-clip border border-hairline bg-card p-5 shadow-clip">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-display-sm text-ink">{template.name}</h3>
        <DeliveryChip channel={template.deliveryChannel} />
      </div>
      <p className="mt-3 font-ui text-body-sm text-ink-2">
        &ldquo;{template.prompt}&rdquo;
      </p>
      <div className="mt-5 flex items-center justify-between border-t border-hairline pt-3">
        <span className="flex items-center gap-1.5 font-mono text-mono-sm text-ink-3">
          <Send className="size-3.5" strokeWidth={1.5} aria-hidden />
          {triggerLabel(template.triggerType)}
          {" · "}
          {template.sendTiming ?? "On demand"}
        </span>
        <span className="font-mono text-mono-sm text-ink-3">
          {template.sentCount} sent
        </span>
      </div>
    </article>
  );
}

function DeliveryChip({ channel }: { channel: "email" | "link" }) {
  const isEmail = channel === "email";
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-pill border border-hairline bg-paper px-2.5 py-1 font-ui text-label uppercase tracking-wide text-ink-3">
      {isEmail ? (
        <Mail className="size-3.5" strokeWidth={1.5} aria-hidden />
      ) : (
        <Link2 className="size-3.5" strokeWidth={1.5} aria-hidden />
      )}
      {isEmail ? "Email" : "Link"}
    </span>
  );
}
