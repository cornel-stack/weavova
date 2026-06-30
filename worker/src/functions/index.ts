import { mediaCaptured } from "./media-captured.js";
import { requestCreated } from "./request-created.js";

// The functions Inngest serves. Inngest auto-syncs (registers) these on every boot — the
// MANDATORY re-sync-on-redeploy behaviour (SC-008): a fresh deploy re-registers, so a
// stalled sync (events fire, nothing runs — the Bristle cron-stall) cannot silently persist.
export const functions = [requestCreated, mediaCaptured];
