import { getCurrentWorkspace } from "@/lib/session";
import { listRequestTemplates } from "@/db/queries";
import { RequestsGrid } from "./requests-grid";

// Server data for /app/requests (US2, ref 05). Two-layer workspace scoping: the /app middleware
// gates the route; this read resolves the CURRENT workspace and lists ONLY its templates. The
// "SAVED TEMPLATES" label sits above the grid (faithful to ref 05).
export async function RequestsData() {
  const ws = await getCurrentWorkspace();
  const templates = await listRequestTemplates(ws.id);

  return (
    <section className="mt-8">
      <h2 className="font-ui text-label uppercase tracking-wide text-ink-3">
        Saved templates
      </h2>
      <RequestsGrid templates={templates} />
    </section>
  );
}
