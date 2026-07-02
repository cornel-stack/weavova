import { getBrandKit } from "@/db/queries";
import { getCurrentWorkspace } from "@/lib/session";
import { DEFAULT_BRAND_COLOR } from "@/lib/brand-kit";
import { OnboardStepper } from "@/components/app/onboarding/onboard-stepper";
import { BrandForm } from "./brand-form";

export const dynamic = "force-dynamic";

// T6.2 · Step 3 — Brand quickstart. PORT of design "3 _ Brand quickstart  _onboard_brand".
// Reuses the existing brand kit (pre-fill) + the existing brand actions. Logo → PUBLIC brand
// bucket (never the private captures bucket). No new brand model.

export default async function OnboardBrandPage() {
  const ws = await getCurrentWorkspace();
  const kit = await getBrandKit(ws.id);

  // The quickstart's single caption toggle derives from the kit's body font (serif = fraunces).
  const initialCaption = kit?.fonts.body === "fraunces" ? "serif" : "grotesk";

  return (
    <div>
      <OnboardStepper current={3} />
      <h1 className="mt-8 font-display text-display-lg text-ink">Make it yours.</h1>
      <p className="mt-2 font-ui text-body text-ink-2">
        One logo, one colour, one font — your clips will wear this.
      </p>
      <div className="mt-8">
        <BrandForm
          initialLogoUrl={kit?.logoAssetUrl ?? null}
          initialColor={kit?.brandColor ?? DEFAULT_BRAND_COLOR}
          initialCaption={initialCaption}
        />
      </div>
    </div>
  );
}
