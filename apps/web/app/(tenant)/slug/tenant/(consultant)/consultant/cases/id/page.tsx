import { CaseDetailHeader } from "@/components/tenant/consultant/case-detail/case-detail-header";
import { CaseRequirements } from "@/components/tenant/consultant/case-detail/case-requirements";
import { CaseInfoSidebar } from "@/components/tenant/consultant/case-detail/case-info-sidebar";
import { CaseSessionsTimeline } from "@/components/tenant/consultant/case-detail/case-sessions-timeline";
import { caseDetail } from "@/components/tenant/consultant/case-detail/case-detail-data";
import { InteractionsTimeline } from "@/components/tenant/consultant/session-detail/interactions-timeline";
import { CommitmentsTimeline } from "@/components/tenant/consultant/session-detail/commitments-timeline";
import { ClientDocuments } from "@/components/tenant/consultant/session-detail/client-documents";
import { NotesSection } from "@/components/tenant/consultant/session-detail/notes-section";
import { ClientTasks } from "@/components/tenant/consultant/client-detail/client-tasks";
import {
  interactions,
  commitments,
  tasks,
  documents,
  notes,
} from "@/components/tenant/consultant/session-detail/session-detail-data";

export default function ConsultantCaseDetailPage() {
  return (
    <div className="flex flex-col gap-5">
      <CaseDetailHeader caseDetail={caseDetail} />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <CaseRequirements requirements={caseDetail.requirements} />
          <CaseSessionsTimeline sessions={caseDetail.sessions} />
          <InteractionsTimeline interactions={interactions} />
          <CommitmentsTimeline commitments={commitments} />
          <ClientTasks tasks={tasks} />
          <ClientDocuments documents={documents} />
          <NotesSection notes={notes} />
        </div>

        <CaseInfoSidebar caseDetail={caseDetail} />
      </div>
    </div>
  );
}
