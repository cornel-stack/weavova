import { Inngest } from "inngest";

// The Inngest client. `id` is the app identity Inngest Cloud registers functions under;
// it must match the app the events are emitted to. The SIGNING key (INNGEST_SIGNING_KEY)
// authenticates Inngest→worker calls and is read by serve() from env automatically.
//
// MANAGED CLOUD: we use Inngest Cloud's hosted servers (no self-hosted Inngest server).
// The app emits via fetch to the Event API (INNGEST_EVENT_KEY); Inngest Cloud invokes the
// functions served here over HTTPS, authenticated by the signing key.
export const inngest = new Inngest({ id: "weavova" });

// The shared event-payload shapes the app emits (kept in sync with
// src/lib/inngest-emit.ts call sites + contracts/inngest-events.md).
export interface RequestCreatedData {
  requestId: string;
  workspaceId: string;
  token: string;
  customerEmail: string | null;
}

export interface MediaCapturedData {
  proofId: string;
  workspaceId: string;
  mediaKey: string;
  proofType: "text" | "video" | "photo" | "audio";
}
