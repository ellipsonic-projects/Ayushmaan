import { OnboardingHeader } from "@/components/tenant/admin/onboarding/onboarding-header";
import { ConsultantOnboardingForm } from "@/components/tenant/admin/onboarding/consultant-onboarding-form";

export default function ConsultantOnboardingPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <OnboardingHeader />
      <ConsultantOnboardingForm />
    </div>
  );
}
