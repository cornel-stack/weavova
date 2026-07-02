import { getCurrentWorkspace } from "@/lib/session";
import { isBusinessType } from "@/lib/onboarding";
import { OnboardStepper } from "@/components/app/onboarding/onboard-stepper";
import { RoleForm } from "./role-form";

// T6.2 · Step 1 — Business type. PORT of design "1 _ Business type  _onboard_role".
// Verbatim copy; writes the real workspace.business_type. The inverse gate (onboard layout)
// guarantees only an un-onboarded workspace reaches here.

export default async function OnboardRolePage() {
  const ws = await getCurrentWorkspace();
  const initial = isBusinessType(ws.businessType) ? ws.businessType : null;

  return (
    <div>
      <OnboardStepper current={1} />
      <h1 className="mt-8 font-display text-display-lg text-ink">
        What kind of business are you?
      </h1>
      <p className="mt-2 font-ui text-body text-ink-2">
        This sets your smart defaults — you can change anything later.
      </p>
      <div className="mt-8">
        <RoleForm initial={initial} />
      </div>
    </div>
  );
}
