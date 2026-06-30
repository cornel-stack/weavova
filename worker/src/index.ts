import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { serve } from "inngest/node";
import { functions } from "./functions/index.js";
import { inngest } from "./inngest.js";

// The Railway worker HTTP host. Two surfaces:
//   • /api/inngest  — the Inngest serve endpoint. GET = sync/registration (Inngest Cloud
//     calls it to discover + register the functions); PUT = re-sync; POST = function
//     invocation. Signing-key authenticated (serve reads INNGEST_SIGNING_KEY from env).
//   • /health       — a plain liveness probe reporting the registered function ids, so the
//     mandatory post-deploy re-sync check (SC-008) has something to read besides the
//     Inngest dashboard.
//
// Inngest auto-syncs on every boot, so each Railway redeploy re-registers the functions.

const PORT = Number(process.env.PORT ?? 3000);

// The Inngest request handler (bare Node http signature). servePath pins the mount point.
const inngestHandler = serve({
  client: inngest,
  functions,
  servePath: "/api/inngest",
});

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const url = req.url ?? "/";

  if (url === "/health" || url.startsWith("/health?")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        status: "ok",
        service: "weavova-worker",
        functions: functions.map((f) => f.id()),
        servePath: "/api/inngest",
      }),
    );
    return;
  }

  if (url === "/" || url.startsWith("/?")) {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("weavova-worker — see /health and /api/inngest");
    return;
  }

  // Everything else (notably /api/inngest) → the Inngest serve handler.
  void inngestHandler(req, res);
});

server.listen(PORT, () => {
  // Visible in Railway logs — confirms the host is up + which functions will register.
  console.log(
    `weavova-worker listening on :${PORT} — serving ${functions.length} function(s) at /api/inngest`,
  );
});
