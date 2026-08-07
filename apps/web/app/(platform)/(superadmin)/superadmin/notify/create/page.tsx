"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth, useTenants, createBroadcast } from "@/lib/hooks";
import type {
  BroadcastUrgency,
  BroadcastScope,
  BroadcastChannel,
  BroadcastTargetRole,
} from "@/lib/hooks";
import { BroadcastFormHeader } from "@/components/platform/notify/create/broadcast-form-header";
import { UrgencyTierSelector } from "@/components/platform/notify/create/urgency-tier-selector";
import { AudienceTargeting } from "@/components/platform/notify/create/audience-targeting";
import { MessageComposer } from "@/components/platform/notify/create/message-composer";
import { ChannelsPanel } from "@/components/platform/notify/create/channels-panel";
import { DeploymentControlsPanel } from "@/components/platform/notify/create/deployment-controls-panel";
import { EstimatedImpactPanel } from "@/components/platform/notify/create/estimated-impact-panel";

const VALID_TARGET_ROLES: BroadcastTargetRole[] = ["ALL", "TENANT_ADMIN", "CONSULTANT", "CLIENT"];

export default function CreateBroadcastPage() {
  return (
    <Suspense fallback={null}>
      <CreateBroadcastForm />
    </Suspense>
  );
}

function CreateBroadcastForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const { tenants } = useTenants({ status: "ACTIVE" });

  const initialTargetRole = VALID_TARGET_ROLES.includes(
    searchParams.get("targetRole") as BroadcastTargetRole
  )
    ? (searchParams.get("targetRole") as BroadcastTargetRole)
    : "ALL";

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [urgency, setUrgency] = useState<BroadcastUrgency>("INFO");
  const [scope, setScope] = useState<BroadcastScope>("GLOBAL");
  const [targetTenantIds, setTargetTenantIds] = useState<string[]>([]);
  const [clientTenantId, setClientTenantId] = useState("");
  const [targetClientId, setTargetClientId] = useState("");
  const [targetRole, setTargetRole] = useState<BroadcastTargetRole>(initialTargetRole);
  const [targetConsultantCategory, setTargetConsultantCategory] = useState("");
  const [targetClientSegment, setTargetClientSegment] = useState<"" | "ACTIVE" | "ON_HOLD">("");
  const [channels, setChannels] = useState<BroadcastChannel[]>(["IN_APP"]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    channels.length > 0 &&
    (scope === "GLOBAL" || !!targetClientId);

  async function handleDeploy() {
    if (!token || !isValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await createBroadcast(
        {
          title: title.trim(),
          body: body.trim(),
          urgency,
          channels,
          scope,
          targetTenantIds: scope === "GLOBAL" ? targetTenantIds : undefined,
          targetClientId: scope === "TARGETED_CLIENT" ? targetClientId : undefined,
          targetRole: scope === "GLOBAL" ? targetRole : undefined,
          targetConsultantCategory:
            scope === "GLOBAL" && targetConsultantCategory ? targetConsultantCategory : undefined,
          targetClientSegment:
            scope === "GLOBAL" && targetClientSegment ? targetClientSegment : undefined,
        },
        token
      );
      router.push("/superadmin/notify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send broadcast");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <BroadcastFormHeader />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-1 flex-col gap-6">
          <UrgencyTierSelector value={urgency} onChange={setUrgency} />
          <AudienceTargeting
            scope={scope}
            onScopeChange={setScope}
            tenants={tenants}
            targetTenantIds={targetTenantIds}
            onTargetTenantIdsChange={setTargetTenantIds}
            clientTenantId={clientTenantId}
            onClientTenantIdChange={(id) => {
              setClientTenantId(id);
              setTargetClientId("");
            }}
            targetClientId={targetClientId}
            onTargetClientIdChange={setTargetClientId}
            targetRole={targetRole}
            onTargetRoleChange={setTargetRole}
            targetConsultantCategory={targetConsultantCategory}
            onTargetConsultantCategoryChange={setTargetConsultantCategory}
            targetClientSegment={targetClientSegment}
            onTargetClientSegmentChange={setTargetClientSegment}
          />
          <MessageComposer
            title={title}
            onTitleChange={setTitle}
            body={body}
            onBodyChange={setBody}
          />
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
        <aside className="flex w-full shrink-0 flex-col gap-6 lg:sticky lg:top-6 lg:w-80">
          <ChannelsPanel channels={channels} onChange={setChannels} />
          <DeploymentControlsPanel
            onDeploy={handleDeploy}
            deploying={submitting}
            disabled={!isValid}
          />
          <EstimatedImpactPanel
            filter={{
              scope,
              targetTenantIds,
              targetClientId: scope === "TARGETED_CLIENT" ? targetClientId : undefined,
              targetRole: scope === "GLOBAL" ? targetRole : undefined,
              targetConsultantCategory: targetConsultantCategory || undefined,
              targetClientSegment: targetClientSegment || undefined,
            }}
          />
        </aside>
      </div>
    </div>
  );
}
