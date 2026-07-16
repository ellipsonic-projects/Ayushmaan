import { BroadcastFormHeader } from "@/components/platform/notify/create/broadcast-form-header";
import { UrgencyTierSelector } from "@/components/platform/notify/create/urgency-tier-selector";
import { AudienceTargeting } from "@/components/platform/notify/create/audience-targeting";
import { MessageComposer } from "@/components/platform/notify/create/message-composer";
import { ChannelsPanel } from "@/components/platform/notify/create/channels-panel";
import { DeploymentControlsPanel } from "@/components/platform/notify/create/deployment-controls-panel";
import { EstimatedImpactPanel } from "@/components/platform/notify/create/estimated-impact-panel";

export default function CreateBroadcastPage() {
  return (
    <div className="flex flex-col gap-6">
      <BroadcastFormHeader />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-1 flex-col gap-6">
          <UrgencyTierSelector />
          <AudienceTargeting />
          <MessageComposer />
        </div>
        <aside className="flex w-full shrink-0 flex-col gap-6 lg:sticky lg:top-6 lg:w-80">
          <ChannelsPanel />
          <DeploymentControlsPanel />
          <EstimatedImpactPanel />
        </aside>
      </div>
    </div>
  );
}
