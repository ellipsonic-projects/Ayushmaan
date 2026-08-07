"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, CalendarClock, CreditCard, Download, FileText } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  updateAppointment,
  approveSeries,
  getAdminDocumentDownloadUrl,
} from "@/lib/api/appointments.client";
import type { TenantAppointment } from "@/lib/api/appointments.server";
import { useTenantSlug } from "@/lib/tenant/slug-context";

type OpenPanel = "reject" | "reschedule" | null;

export function AppointmentDetailView({ appointment }: { appointment: TenantAppointment }) {
  const router = useRouter();
  const slug = useTenantSlug();
  const listHref = `/${slug}/tenant/admin/appointments`;

  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [reason, setReason] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleDownload(documentId: string) {
    setDownloadingId(documentId);
    try {
      const url = await getAdminDocumentDownloadUrl(appointment.case.id, documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get document link");
    } finally {
      setDownloadingId(null);
    }
  }

  async function withSubmitting(action: () => Promise<void>) {
    setSubmitting(true);
    setError(null);
    try {
      await action();
      router.push(listHref);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    await withSubmitting(() => updateAppointment(appointment.id, { status: "ADMIN_APPROVED" }));
  }

  async function handleApproveSeries() {
    if (!appointment.seriesId) return;
    await withSubmitting(async () => {
      await approveSeries(appointment.seriesId!);
    });
  }

  async function handleReject() {
    await withSubmitting(() =>
      updateAppointment(appointment.id, {
        status: "CANCELLED",
        cancellationReason: reason || undefined,
      })
    );
  }

  async function handleReschedule() {
    if (!newStart || !newEnd) return;
    await withSubmitting(() =>
      updateAppointment(appointment.id, {
        status: "RESCHEDULE_PROPOSED",
        scheduledStart: new Date(newStart).toISOString(),
        scheduledEnd: new Date(newEnd).toISOString(),
      })
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href={listHref}
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to pending approvals
        </Link>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-500">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {appointment.case.client.fullName}
            </h1>
            <p className="text-sm text-muted-foreground">
              {appointment.case.consultant?.fullName ?? "Awaiting consultant assignment"} ·{" "}
              {appointment.case.category}
            </p>
          </div>
          <Badge variant="outline" className="ml-auto">
            {appointment.status}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointment details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Requested slot</p>
              <p className="text-foreground" suppressHydrationWarning>
                {format(new Date(appointment.scheduledStart), "EEE, MMM d, yyyy 'at' h:mm a")} –{" "}
                {format(new Date(appointment.scheduledEnd), "h:mm a")}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Category</p>
              <p className="text-foreground">{appointment.case.category}</p>
            </div>
          </div>

          {appointment.meetingLink && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Meeting link</p>
              <a
                href={appointment.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-primary hover:underline"
              >
                {appointment.meetingLink}
              </a>
            </div>
          )}

          {appointment.case.requirementsSubject && (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Subject</p>
              <p className="text-foreground">{appointment.case.requirementsSubject}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground">Requirements</p>
            <p className="whitespace-pre-wrap text-foreground">
              {appointment.case.requirements ?? "No requirements provided."}
            </p>
          </div>

          {appointment.case.documents.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                Attached documents
              </p>
              <div className="flex flex-col gap-1.5">
                {appointment.case.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5"
                  >
                    <span className="min-w-0 truncate text-foreground">{doc.fileName}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={downloadingId === doc.id}
                      aria-label={`Download ${doc.fileName}`}
                      onClick={() => handleDownload(doc.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {appointment.payments.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" />
                Payments
              </p>
              <div className="flex flex-col gap-1.5">
                {appointment.payments.map((payment, i) => (
                  <div key={i} className="flex items-center justify-between text-foreground">
                    <span>{payment.amount}</span>
                    <Badge variant="outline">{payment.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-tour="admin-appointment-detail">
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => setOpenPanel(openPanel === "reschedule" ? null : "reschedule")}
            >
              Propose Reschedule
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => setOpenPanel(openPanel === "reject" ? null : "reject")}
            >
              Reject
            </Button>
            {appointment.seriesId && (
              <Button
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={handleApproveSeries}
              >
                Approve Series
              </Button>
            )}
            <Button size="sm" disabled={submitting} onClick={handleApprove}>
              Approve
            </Button>
          </div>

          {openPanel === "reject" && (
            <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <Textarea
                placeholder="Reason for rejecting (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setOpenPanel(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={submitting}
                  onClick={handleReject}
                >
                  Confirm Reject
                </Button>
              </div>
            </div>
          )}

          {openPanel === "reschedule" && (
            <div className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-end">
              <label className="flex flex-1 flex-col gap-1 text-sm">
                New start
                <input
                  type="datetime-local"
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-sm">
                New end
                <input
                  type="datetime-local"
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                />
              </label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setOpenPanel(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={submitting || !newStart || !newEnd}
                  onClick={handleReschedule}
                >
                  Send Proposal
                </Button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
