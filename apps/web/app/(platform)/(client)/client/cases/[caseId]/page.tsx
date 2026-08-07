import { notFound } from "next/navigation";

import { CaseTimeline } from "@/components/tenant/shared/case-timeline";
import { CaseTimelineExportButton } from "@/components/tenant/client/case-detail/case-timeline-export-button";
import { getCaseDetail } from "@/lib/api/case-detail.server";

export default async function ClientCaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  const caseDetail = await getCaseDetail(caseId);

  if (!caseDetail) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {caseDetail.matterKey ?? `Case #${caseDetail.id.slice(0, 8)}`}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {caseDetail.category} &middot; with {caseDetail.consultant.fullName}
          </p>
        </div>
        <CaseTimelineExportButton caseDetail={caseDetail} />
      </div>

      <CaseTimeline
        caseId={caseDetail.id}
        sessions={caseDetail.appointments}
        interactions={caseDetail.interactions}
        commitments={caseDetail.commitments}
        tasks={caseDetail.tasks}
        documents={caseDetail.documents}
        readOnly
      />
    </div>
  );
}
