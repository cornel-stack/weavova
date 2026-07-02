import { getCurrentWorkspace } from "@/lib/session";
import { isFirstFormat } from "@/lib/onboarding";
import { OnboardStepper } from "@/components/app/onboarding/onboard-stepper";
import { FormatForm } from "./format-form";

// T6.2 · Step 4 — First format. PORT of design "4 _ First format  _onboard_format".
// Preference-only: writes workspace.first_format and finishes onboarding. No render (T8).

export default async function OnboardFormatPage() {
  const ws = await getCurrentWorkspace();
  const initial = isFirstFormat(ws.firstFormat) ? ws.firstFormat : null;

  return (
    <div>
      <OnboardStepper current={4} />
      <h1 className="mt-8 font-display text-display-lg text-ink">
        Pick your first format.
      </h1>
      <p className="mt-2 font-ui text-body text-ink-2">
        We’ll start you here — switch any time in the studio.
      </p>
      <div className="mt-8">
        <FormatForm initial={initial} />
      </div>
    </div>
  );
}
