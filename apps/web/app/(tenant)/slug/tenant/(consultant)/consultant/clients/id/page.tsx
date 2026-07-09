import { ClientProfileHeader } from "@/components/tenant/consultant/client-detail/client-profile-header";
import { ClientDetailStatsRow } from "@/components/tenant/consultant/client-detail/client-stats-row";
import { ClientInfoSidebar } from "@/components/tenant/consultant/client-detail/client-info-sidebar";
import { ClientCases } from "@/components/tenant/consultant/client-detail/client-cases";
import { clientProfile, clientStats } from "@/components/tenant/consultant/client-detail/client-detail-data";
import { cases } from "@/components/tenant/consultant/cases/cases-data";
import {
  interactions,
  commitments,
  tasks,
  documents,
  notes,
} from "@/components/tenant/consultant/session-detail/session-detail-data";

export default function ConsultantClientDetailPage() {
  const clientCases = cases.filter((item) => item.clientId === clientProfile.id);

  return (
    <div className="flex flex-col gap-5">
      <ClientProfileHeader client={clientProfile} />
      <ClientDetailStatsRow stats={clientStats} />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <ClientCases cases={clientCases} />
        </div>
        <ClientInfoSidebar client={clientProfile} />
      </div>
    </div>
  );
}
