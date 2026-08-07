import { format } from "date-fns";
import type {
  AppointmentDbStatus,
  CaseDetailData,
  InteractionType,
} from "@/lib/api/case-detail.server";

const sessionStatusLabel: Record<AppointmentDbStatus, string> = {
  REQUESTED: "Requested",
  ADMIN_APPROVED: "Pending Consultant",
  APPROVED: "Scheduled",
  RESCHEDULE_PROPOSED: "Reschedule Proposed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

const interactionTypeLabel: Record<InteractionType, string> = {
  CALL_LOG: "Call",
  SESSION_NOTE: "Session Note",
  MESSAGE_LOG: "Message",
  AD_HOC_NOTE: "Note",
};

interface PdfLine {
  date: string;
  heading: string;
  body?: string;
}

function buildLines(caseDetail: CaseDetailData): PdfLine[] {
  const lines: PdfLine[] = [
    ...caseDetail.appointments.map((a) => ({
      date: a.scheduledStart,
      heading: `Session — ${sessionStatusLabel[a.status]}`,
      body: `${format(new Date(a.scheduledStart), "h:mm a")} – ${format(new Date(a.scheduledEnd), "h:mm a")}`,
    })),
    ...caseDetail.interactions.map((i) => ({
      date: i.createdAt,
      heading: interactionTypeLabel[i.type],
      body: i.notes,
    })),
    ...caseDetail.commitments.map((c) => ({
      date: c.createdAt,
      heading: `Commitment — ${c.title}`,
      body: c.description ?? undefined,
    })),
    ...caseDetail.tasks.map((t) => ({
      date: t.createdAt,
      heading: `Task — ${t.title}`,
      body: `Assigned to ${t.assignedTo === "CONSULTANT" ? "Consultant" : "Client"}`,
    })),
    ...caseDetail.documents.map((d) => ({
      date: d.createdAt,
      heading: `Document — ${d.fileName}`,
    })),
  ];

  return lines.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Generates and downloads a PDF of the case's client-visible timeline
// (sprint 4.5 item 4 — the data passed in is already filtered server-side
// by isClientVisible for the CLIENT role, see cases.router.ts GET /:caseId).
export async function downloadCaseTimelinePdf(caseDetail: CaseDetailData) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  function ensureSpace(lineHeight: number) {
    if (y + lineHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  doc.setFontSize(16);
  doc.text(caseDetail.matterKey ?? `Case #${caseDetail.id.slice(0, 8)}`, margin, y);
  y += 20;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `${caseDetail.category} · Consultant: ${caseDetail.consultant.fullName} · Client: ${caseDetail.client.fullName}`,
    margin,
    y
  );
  y += 24;
  doc.setTextColor(0);

  for (const line of buildLines(caseDetail)) {
    ensureSpace(32);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(format(new Date(line.date), "EEE, d MMM yyyy · h:mm a"), margin, y);
    y += 14;

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(line.heading, margin, y);
    y += 14;

    if (line.body) {
      doc.setFontSize(10);
      doc.setTextColor(60);
      const wrapped = doc.splitTextToSize(line.body, maxWidth);
      for (const wrappedLine of wrapped) {
        ensureSpace(13);
        doc.text(wrappedLine, margin, y);
        y += 13;
      }
    }
    y += 8;
  }

  doc.save(`case-timeline-${caseDetail.id.slice(0, 8)}.pdf`);
}
