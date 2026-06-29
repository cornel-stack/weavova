import { getCurrentWorkspace } from "@/lib/session";
import { getBrandKit } from "@/db/queries";
import { RequestBuilder } from "./request-builder";

// PORT: 06 _ Request builder (/app/requests/new). Authenticated /app surface (middleware +
// workspace-scoped). The server shell resolves the current workspace + its brand (for the
// "CUSTOMER SEES" preview + the pre-filled consent line) and hands them to the client builder.

export const metadata = {
  title: "New request — Weavova",
};

export default async function NewRequestPage() {
  const ws = await getCurrentWorkspace();
  const brand = await getBrandKit(ws.id);

  return (
    <RequestBuilder
      workspaceName={ws.name}
      brand={
        brand
          ? { logoAssetUrl: brand.logoAssetUrl, brandColor: brand.brandColor }
          : null
      }
    />
  );
}
