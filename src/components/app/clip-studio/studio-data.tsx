import { notFound } from "next/navigation";
import { getProof } from "@/db/queries";
import { ClipStudio } from "./clip-studio";
import { StudioConsentRequired } from "./studio-consent-required";

// The studio data integrator (async Server, T2.4b). Reuses the T2.3 workspace-scoped
// getProof (withDbRetry, tenant-isolated): a missing or cross-workspace id → null →
// notFound() (the same content-free not-found as the detail; no leak). getProof /
// ProofDetailView are byte-unchanged — the studio is a separate consumer.
//
// The consent gate lives at the STUDIO, not only at the entry button (FR-008): a
// directly-reached studio for a non-granted proof renders the honest consent-required
// state and NO configure/Generate path. (The render is re-checked again at generate
// time — P-VII — by the Server Action, on the CURRENT effective consent.)

export async function StudioData({
  workspaceId,
  id,
}: {
  workspaceId: string;
  id: string;
}) {
  const proof = await getProof(workspaceId, id);

  if (!proof) {
    notFound();
  }

  if (proof.consentState !== "granted") {
    return (
      <div className="mx-auto max-w-content px-6 py-10">
        <StudioConsentRequired proofId={proof.id} />
      </div>
    );
  }

  return <ClipStudio proof={proof} />;
}
