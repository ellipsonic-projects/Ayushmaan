import { notFound } from "next/navigation";
import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CaseDetailHeader } from "@/components/tenant/consultant/case-detail/case-detail-header";
import { CaseRequirements } from "@/components/tenant/consultant/case-detail/case-requirements";
import { IntakeFormSubmissions } from "@/components/tenant/consultant/case-detail/intake-form-submissions";
import { CaseInfoSidebar } from "@/components/tenant/consultant/case-detail/case-info-sidebar";
import { AppointmentTimeline } from "@/components/tenant/consultant/case-detail/appointment-timeline";
import { QuickCaptureTriggerButton } from "@/components/tenant/consultant/case-detail/quick-capture-trigger-button";
import { NewAppointmentDialog } from "@/components/tenant/consultant/clients/new-appointment-dialog";
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CaseDetailHeader caseDetail={caseDetail} />
        <div className="flex shrink-0 gap-2">
          {ownConsultant && (
            <NewAppointmentDialog
              ownConsultantId={ownConsultant.id}
              presetCaseId={caseDetail.id}
              client={{
                id: caseDetail.clientId,
                fullName: caseDetail.client.fullName,
                user: caseDetail.client.user,
                cases: [],
              }}
              trigger={
                <Button variant="outline" size="sm" className="gap-2">
                  <CalendarPlus className="h-4 w-4" />
                  New Appointment
                </Button>
              }
            />
          )}
          <QuickCaptureTriggerButton caseId={caseDetail.id} />
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <CaseRequirements caseId={caseDetail.id} requirements={caseDetail.requirements} />
          <IntakeFormSubmissions submissions={caseDetail.formSubmissions} />
          <div data-tour="consultant-case-timeline">
            <AppointmentTimeline
              caseId={caseDetail.id}
              sessions={caseDetail.appointments}
              interactions={caseDetail.interactions}
              commitments={caseDetail.commitments}
              tasks={caseDetail.tasks}
              documents={caseDetail.documents}
            />
          </div>
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
