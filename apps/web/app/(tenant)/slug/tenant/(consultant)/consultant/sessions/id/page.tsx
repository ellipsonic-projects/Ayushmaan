import { SessionDetailHeader } from "@/components/tenant/consultant/session-detail/session-detail-header";
import { InteractionsTimeline } from "@/components/tenant/consultant/session-detail/interactions-timeline";
import { CommitmentsTimeline } from "@/components/tenant/consultant/session-detail/commitments-timeline";
import { ClientDocuments } from "@/components/tenant/consultant/session-detail/client-documents";
import { NotesSection } from "@/components/tenant/consultant/session-detail/notes-section";
import { AiChatSidebar } from "@/components/tenant/consultant/session-detail/ai-chat-sidebar";
import {
  caseSummary,
  interactions,
  commitments,
  documents,
  notes,
  chatMessages,
} from "@/components/tenant/consultant/session-detail/session-detail-data";

export default function ConsultantSessionDetailPage() {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <SessionDetailHeader caseSummary={caseSummary} />
        <NotesSection notes={notes} />
        <InteractionsTimeline interactions={interactions} />
        <CommitmentsTimeline commitments={commitments} />
        <ClientDocuments documents={documents} />
      </div>

      <AiChatSidebar initialMessages={chatMessages} />
    </div>
  );
}
