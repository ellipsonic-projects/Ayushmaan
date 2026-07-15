import { notFound } from "next/navigation";

import { CaseDetailHeader } from "@/components/tenant/consultant/case-detail/case-detail-header";
import { CaseRequirements } from "@/components/tenant/consultant/case-detail/case-requirements";
import { CaseInfoSidebar } from "@/components/tenant/consultant/case-detail/case-info-sidebar";
import { CaseSessionsTimeline } from "@/components/tenant/consultant/case-detail/case-sessions-timeline";
import { CaseInteractionsTimeline } from "@/components/tenant/consultant/case-detail/case-interactions-timeline";
import { CaseCommitmentsTimeline } from "@/components/tenant/consultant/case-detail/case-commitments-timeline";
import { CaseTasks } from "@/components/tenant/consultant/case-detail/case-tasks";
import { CaseDocuments } from "@/components/tenant/consultant/case-detail/case-documents";
import { getCaseDetail } from "@/lib/api/case-detail.server";
import { getOwnConsultantProfile, getTenantConsultants } from "@/lib/api/consultants.server";

export default async function ConsultantCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [caseDetail, ownConsultant, consultants] = await Promise.all([
    getCaseDetail(id),
    getOwnConsultantProfile(),
    getTenantConsultants(),
  ]);

  if (!caseDetail) notFound();

  return (
    <div className="flex flex-col gap-5">
      <CaseDetailHeader caseDetail={caseDetail} />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <CaseRequirements caseId={caseDetail.id} requirements={caseDetail.requirements} />
          <CaseSessionsTimeline sessions={caseDetail.appointments} />
          <CaseInteractionsTimeline caseId={caseDetail.id} interactions={caseDetail.interactions} />
          <CaseCommitmentsTimeline caseId={caseDetail.id} commitments={caseDetail.commitments} />
          <CaseTasks caseId={caseDetail.id} tasks={caseDetail.tasks} />
          <CaseDocuments documents={caseDetail.documents} />
        </div>

        <CaseInfoSidebar
          caseDetail={caseDetail}
          ownConsultantId={ownConsultant?.id ?? null}
          consultants={consultants.map((c) => ({ id: c.id, fullName: c.fullName }))}
        />
      </div>
    </div>
  );
}
