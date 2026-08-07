"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  CalendarPlus,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock3,
  Download,
  FileText,
  History,
  Loader2,
  Mic,
  ShieldAlert,
  StickyNote,
  Upload,
  XCircle,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VoiceTranscribeButton } from "@/components/tenant/consultant/session-detail/voice-transcribe-button";
import { cn } from "@/lib/utils";
import {
  bookFollowUpAppointment,
  createCommitment,
  createDocument,
  createInteraction,
  createTask,
  getDocumentDownloadUrl,
  requestDocumentUploadUrl,
  uploadCaseDocumentFile,
} from "@/lib/api/case-detail.client";
import type {
  AppointmentDbStatus,
  CaseCommitment,
  CaseDocument,
  CaseInteraction,
  CaseSession,
  CaseTask,
  CommitmentDbStatus,
  TaskDbStatus,
} from "@/lib/api/case-detail.server";

const sessionStatusIcon: Record<AppointmentDbStatus, typeof Clock3> = {
  REQUESTED: Clock3,
  ADMIN_APPROVED: Clock3,
  APPROVED: Clock3,
  RESCHEDULE_PROPOSED: Clock3,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
  NO_SHOW: XCircle,
};
const sessionStatusLabel: Record<AppointmentDbStatus, string> = {
  REQUESTED: "Requested",
  ADMIN_APPROVED: "Pending Consultant",
  APPROVED: "Scheduled",
  RESCHEDULE_PROPOSED: "Reschedule Proposed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};
const sessionStatusBadgeClass: Record<AppointmentDbStatus, string> = {
  REQUESTED:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  ADMIN_APPROVED:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  APPROVED:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  RESCHEDULE_PROPOSED:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  COMPLETED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  CANCELLED: "border-border text-muted-foreground",
  NO_SHOW: "border-border text-muted-foreground",
};

const commitmentStatusIcon: Record<CommitmentDbStatus, typeof Circle> = {
  ACTIVE: Circle,
  COMPLETED: CheckCircle2,
  DISCONTINUED: XCircle,
};

function commitmentDisplayStatus(item: CaseCommitment): { label: string; className: string } {
  if (item.status === "COMPLETED") {
    return {
      label: "Completed",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
    };
  }
  if (item.status === "DISCONTINUED") {
    return { label: "Discontinued", className: "border-border text-muted-foreground" };
  }
  if (item.dueAt && new Date(item.dueAt).getTime() < Date.now()) {
    return {
      label: "Overdue",
      className: "border-destructive/30 bg-destructive/10 text-destructive",
    };
  }
  return { label: "Active", className: "text-muted-foreground" };
}

const taskStatusIcon: Record<TaskDbStatus, typeof Circle> = {
  OPEN: Circle,
  COMPLETED: CheckCircle2,
  OVERDUE: ShieldAlert,
};
const taskStatusLabel: Record<TaskDbStatus, string> = {
  OPEN: "Open",
  COMPLETED: "Completed",
  OVERDUE: "Overdue",
};
const taskStatusBadgeClass: Record<TaskDbStatus, string> = {
  OPEN: "text-muted-foreground",
  COMPLETED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  OVERDUE: "border-destructive/30 bg-destructive/10 text-destructive",
};

function fileType(fileName: string) {
  const ext = fileName.split(".").pop();
  return ext ? ext.toUpperCase() : "FILE";
}

function CommitmentRow({
  commitment,
  appointmentLabel,
}: {
  commitment: CaseCommitment;
  appointmentLabel?: string;
}) {
  const status = commitmentDisplayStatus(commitment);
  const Icon = commitmentStatusIcon[commitment.status];
  return (
    <div className="flex gap-2 rounded-md border border-border/60 p-2">
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", status.className)} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-medium text-foreground">{commitment.title}</p>
          <Badge variant="outline" className={status.className}>
            {status.label}
          </Badge>
          {appointmentLabel && (
            <Badge variant="secondary" className="text-muted-foreground">
              {appointmentLabel}
            </Badge>
          )}
        </div>
        {commitment.description && (
          <p className="text-sm text-muted-foreground">{commitment.description}</p>
        )}
        {commitment.dueAt && (
          <p className="text-xs text-muted-foreground">
            Due {format(new Date(commitment.dueAt), "EEE, dd MMM · h:mm a")}
          </p>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task, appointmentLabel }: { task: CaseTask; appointmentLabel?: string }) {
  const Icon = taskStatusIcon[task.status];
  return (
    <div className="flex gap-2 rounded-md border border-border/60 p-2">
      <Icon className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", taskStatusBadgeClass[task.status])} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-medium text-foreground">{task.title}</p>
          <Badge variant="outline" className={taskStatusBadgeClass[task.status]}>
            {taskStatusLabel[task.status]}
          </Badge>
          {appointmentLabel && (
            <Badge variant="secondary" className="text-muted-foreground">
              {appointmentLabel}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Assigned to {task.assignedTo === "CONSULTANT" ? "Consultant" : "Client"}
          {task.dueAt && ` · Due ${format(new Date(task.dueAt), "EEE, dd MMM · h:mm a")}`}
        </p>
      </div>
    </div>
  );
}

function NoteRow({
  interaction,
  commitments,
  tasks,
  appointmentLabel,
}: {
  interaction: CaseInteraction;
  commitments: CaseCommitment[];
  tasks: CaseTask[];
  appointmentLabel?: string;
}) {
  const isAudio = Boolean(interaction.audioStoragePath);
  return (
    <div className="rounded-md border border-border/60 p-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {appointmentLabel && (
          <Badge variant="secondary" className="text-muted-foreground">
            {appointmentLabel}
          </Badge>
        )}
        {isAudio ? (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Mic className="h-3 w-3" />
            Audio{" "}
            {interaction.transcriptionStatus === "COMPLETE"
              ? "· Transcribed"
              : "· " + (interaction.transcriptionStatus ?? "")}
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <StickyNote className="h-3 w-3" />
            Written
          </Badge>
        )}
        {!interaction.isClientVisible && (
          <Badge variant="secondary" className="text-muted-foreground">
            Internal
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(interaction.createdAt), { addSuffix: true })}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{interaction.notes}</p>
      {(commitments.length > 0 || tasks.length > 0) && (
        <div className="mt-1.5 flex flex-col gap-1.5 border-t border-border/60 pt-1.5">
          {commitments.map((c) => (
            <CommitmentRow key={c.id} commitment={c} />
          ))}
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentDownloadButton({
  caseId,
  documentId,
  fileName,
}: {
  caseId: string;
  documentId: string;
  fileName: string;
}) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const url = await getDocumentDownloadUrl(caseId, documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Download ${fileName}`}
      onClick={handleDownload}
      disabled={downloading}
    >
      {downloading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </Button>
  );
}

function DocumentRow({
  caseId,
  document: doc,
  appointmentLabel,
}: {
  caseId: string;
  document: CaseDocument;
  appointmentLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 p-2">
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-medium text-foreground">{doc.fileName}</p>
          {appointmentLabel && (
            <Badge variant="secondary" className="text-muted-foreground">
              {appointmentLabel}
            </Badge>
          )}
          {!doc.isClientVisible && (
            <Badge variant="secondary" className="text-muted-foreground">
              Internal
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {fileType(doc.fileName)} &middot; {format(new Date(doc.createdAt), "dd MMM yyyy")}
        </p>
      </div>
      <DocumentDownloadButton caseId={caseId} documentId={doc.id} fileName={doc.fileName} />
    </div>
  );
}

function BookFollowUpDialog({
  caseId,
  onBooked,
}: {
  caseId: string;
  onBooked: (appointment: CaseSession) => void;
}) {
  const [open, setOpen] = useState(false);
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!scheduledStart || !scheduledEnd) return;
    setSubmitting(true);
    setError(null);
    try {
      const appointment = await bookFollowUpAppointment(caseId, {
        scheduledStart: new Date(scheduledStart).toISOString(),
        scheduledEnd: new Date(scheduledEnd).toISOString(),
        meetingLink: meetingLink || undefined,
      });
      onBooked(appointment);
      setOpen(false);
      setScheduledStart("");
      setScheduledEnd("");
      setMeetingLink("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book follow-up");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <CalendarPlus className="h-4 w-4" />
        Book follow-up
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Book a follow-up session</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="follow-up-start">Start</Label>
              <Input
                id="follow-up-start"
                type="datetime-local"
                value={scheduledStart}
                onChange={(e) => setScheduledStart(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="follow-up-end">End</Label>
              <Input
                id="follow-up-end"
                type="datetime-local"
                value={scheduledEnd}
                onChange={(e) => setScheduledEnd(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="follow-up-link">Meeting link (optional)</Label>
              <Input
                id="follow-up-link"
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={!scheduledStart || !scheduledEnd || submitting}
            >
              {submitting ? "Booking…" : "Book"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AppointmentCard({
  caseId,
  appointment,
  notes,
  commitments,
  tasks,
  documents,
  onNoteAdded,
  onCommitmentAdded,
  onTaskAdded,
  onDocumentAdded,
}: {
  caseId: string;
  appointment: CaseSession;
  notes: CaseInteraction[];
  commitments: CaseCommitment[];
  tasks: CaseTask[];
  documents: CaseDocument[];
  onNoteAdded: (note: CaseInteraction) => void;
  onCommitmentAdded: (commitment: CaseCommitment) => void;
  onTaskAdded: (task: CaseTask) => void;
  onDocumentAdded: (document: CaseDocument) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [composeType, setComposeType] = useState<
    "interaction" | "commitment" | "task" | "document"
  >("interaction");
  const [draft, setDraft] = useState("");
  const [isClientVisible, setIsClientVisible] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Tasks logged against an appointment always need a deadline — enforced
  // server-side (case-tasks.router.ts), required here too.
  const [taskDueAt, setTaskDueAt] = useState("");
  const Icon = sessionStatusIcon[appointment.status];

  async function handleAddNote() {
    const content = draft.trim();
    if (!content) return;
    setSubmitting(true);
    try {
      const created = await createInteraction(caseId, {
        type: "SESSION_NOTE",
        appointmentId: appointment.id,
        notes: content,
        isClientVisible,
      });
      onNoteAdded(created);
      setDraft("");
      setIsClientVisible(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddCommitmentOrTask() {
    const content = draft.trim();
    if (!content) return;
    if (composeType === "task" && !taskDueAt) return;
    setSubmitting(true);
    try {
      const title = content.length > 60 ? `${content.slice(0, 60)}...` : content;
      if (composeType === "commitment") {
        const created = await createCommitment(caseId, {
          title,
          description: content,
          appointmentId: appointment.id,
        });
        onCommitmentAdded(created);
      } else {
        const created = await createTask(caseId, {
          title,
          appointmentId: appointment.id,
          dueAt: new Date(taskDueAt).toISOString(),
        });
        onTaskAdded(created);
        setTaskDueAt("");
      }
      setDraft("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUploadDocument() {
    if (!documentFile) return;
    setSubmitting(true);
    try {
      const { path, token } = await requestDocumentUploadUrl(caseId, documentFile.name);
      await uploadCaseDocumentFile(path, token, documentFile);
      const created = await createDocument(caseId, {
        fileName: documentFile.name,
        storagePath: path,
        isClientVisible,
        appointmentId: appointment.id,
      });
      onDocumentAdded(created);
      setDocumentFile(null);
      setIsClientVisible(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="text-muted-foreground hover:text-foreground"
            aria-label={isExpanded ? "Collapse appointment details" : "Expand appointment details"}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          <Icon className="h-4 w-4 text-muted-foreground" />
          <Link
            href={`../../sessions/${appointment.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {format(new Date(appointment.scheduledStart), "EEE, d MMM")}
          </Link>
          <Badge variant="outline" className={sessionStatusBadgeClass[appointment.status]}>
            {sessionStatusLabel[appointment.status]}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(appointment.scheduledStart), "h:mm a")} &ndash;{" "}
            {format(new Date(appointment.scheduledEnd), "h:mm a")}
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {isExpanded ? "Hide details" : "View details"}
          </button>
        </div>

        {isExpanded && (
          <div className="flex flex-col gap-2 border-t border-border pt-2">
            {notes.length === 0 &&
            commitments.length === 0 &&
            tasks.length === 0 &&
            documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing logged for this appointment yet.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {notes.map((note) => (
                  <NoteRow key={note.id} interaction={note} commitments={[]} tasks={[]} />
                ))}
                {commitments.map((c) => (
                  <CommitmentRow key={c.id} commitment={c} />
                ))}
                {tasks.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
                {documents.map((d) => (
                  <DocumentRow key={d.id} caseId={caseId} document={d} />
                ))}
              </div>
            )}

            <div className="flex flex-col gap-1.5 border-t border-border pt-2">
              <Tabs
                value={composeType}
                onValueChange={(v) => v && setComposeType(v as typeof composeType)}
              >
                <TabsList variant="line">
                  <TabsTrigger value="interaction">Note</TabsTrigger>
                  <TabsTrigger value="commitment">Commitment</TabsTrigger>
                  <TabsTrigger value="task">Task</TabsTrigger>
                  <TabsTrigger value="document">Document</TabsTrigger>
                </TabsList>
              </Tabs>

              {composeType === "document" ? (
                <div className="flex flex-col gap-1.5">
                  <Input
                    type="file"
                    onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)}
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`appt-doc-visible-${appointment.id}`}
                      checked={isClientVisible}
                      onCheckedChange={setIsClientVisible}
                    />
                    <Label
                      htmlFor={`appt-doc-visible-${appointment.id}`}
                      className="text-xs text-muted-foreground"
                    >
                      Visible to client
                    </Label>
                  </div>
                  <Button
                    size="sm"
                    className="w-fit gap-2"
                    onClick={handleUploadDocument}
                    disabled={!documentFile || submitting}
                  >
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Upload document
                  </Button>
                </div>
              ) : (
                <>
                  <Textarea
                    placeholder={
                      composeType === "interaction"
                        ? "Add a session note, or use the mic to dictate..."
                        : `Describe this ${composeType}...`
                    }
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="min-h-10"
                  />
                  {composeType === "task" && (
                    <div className="flex items-center gap-2">
                      <Label
                        htmlFor={`task-due-${appointment.id}`}
                        className="text-xs text-muted-foreground"
                      >
                        Deadline
                      </Label>
                      <Input
                        id={`task-due-${appointment.id}`}
                        type="datetime-local"
                        value={taskDueAt}
                        onChange={(e) => setTaskDueAt(e.target.value)}
                        className="w-fit"
                      />
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={
                        composeType === "interaction" ? handleAddNote : handleAddCommitmentOrTask
                      }
                      disabled={
                        !draft.trim() || submitting || (composeType === "task" && !taskDueAt)
                      }
                    >
                      {composeType === "interaction"
                        ? "Add note"
                        : composeType === "commitment"
                          ? "Add commitment"
                          : "Add task"}
                    </Button>
                    <VoiceTranscribeButton
                      label="Dictate"
                      onTranscript={(text) => setDraft((prev) => (prev ? `${prev} ${text}` : text))}
                    />
                    {composeType === "interaction" && (
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`session-visible-${appointment.id}`}
                          checked={isClientVisible}
                          onCheckedChange={setIsClientVisible}
                        />
                        <Label
                          htmlFor={`session-visible-${appointment.id}`}
                          className="text-xs text-muted-foreground"
                        >
                          Visible to client
                        </Label>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AppointmentTimeline({
  caseId,
  sessions,
  interactions: initialInteractions,
  commitments: initialCommitments,
  tasks: initialTasks,
  documents: initialDocuments,
}: {
  caseId: string;
  sessions: CaseSession[];
  interactions: CaseInteraction[];
  commitments: CaseCommitment[];
  tasks: CaseTask[];
  documents: CaseDocument[];
}) {
  const [sessionList, setSessionList] = useState(sessions);
  const [interactions, setInteractions] = useState(initialInteractions);
  const [commitments, setCommitments] = useState(initialCommitments);
  const [tasks, setTasks] = useState(initialTasks);
  const [documents, setDocuments] = useState(initialDocuments);

  const [viewMode, setViewMode] = useState<
    "appointments" | "interactions" | "commitments" | "tasks"
  >("appointments");

  const [draft, setDraft] = useState("");
  const [isClientVisible, setIsClientVisible] = useState(false);
  const [docClientVisible, setDocClientVisible] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const sortedSessions = useMemo(
    () =>
      [...sessionList].sort(
        (a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime()
      ),
    [sessionList]
  );

  const appointmentsById = useMemo(() => new Map(sessionList.map((a) => [a.id, a])), [sessionList]);

  function appointmentLabel(appointmentId: string | null): string | undefined {
    if (!appointmentId) return undefined;
    const appointment = appointmentsById.get(appointmentId);
    return appointment ? format(new Date(appointment.scheduledStart), "d MMM") : undefined;
  }

  function groupByAppointment<T extends { appointmentId: string | null }>(items: T[]) {
    const map = new Map<string, T[]>();
    for (const item of items) {
      if (!item.appointmentId) continue;
      const list = map.get(item.appointmentId) ?? [];
      list.push(item);
      map.set(item.appointmentId, list);
    }
    return map;
  }

  const notesByAppointment = useMemo(() => groupByAppointment(interactions), [interactions]);
  const commitmentsByAppointment = useMemo(() => groupByAppointment(commitments), [commitments]);
  const tasksByAppointment = useMemo(() => groupByAppointment(tasks), [tasks]);
  const documentsByAppointment = useMemo(() => groupByAppointment(documents), [documents]);

  // Standalone items (not scoped to an appointment) can only be composed
  // here as ad-hoc/case-level items — appointment-scoped items are only
  // composed from within that appointment's card.
  async function handleComposeStandalone() {
    const content = draft.trim();
    if (!content) return;

    setSubmitting(true);
    try {
      if (viewMode === "interactions") {
        const created = await createInteraction(caseId, {
          type: "AD_HOC_NOTE",
          notes: content,
          isClientVisible,
        });
        setInteractions((prev) => [created, ...prev]);
      } else if (viewMode === "commitments") {
        const created = await createCommitment(caseId, {
          title: content.length > 60 ? `${content.slice(0, 60)}...` : content,
          description: content,
        });
        setCommitments((prev) => [created, ...prev]);
      } else if (viewMode === "tasks") {
        const created = await createTask(caseId, {
          title: content.length > 60 ? `${content.slice(0, 60)}...` : content,
        });
        setTasks((prev) => [created, ...prev]);
      }
      setDraft("");
      setIsClientVisible(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUploadStandaloneDocument() {
    if (!documentFile) return;

    setSubmitting(true);
    try {
      const { path, token } = await requestDocumentUploadUrl(caseId, documentFile.name);
      await uploadCaseDocumentFile(path, token, documentFile);
      const created = await createDocument(caseId, {
        fileName: documentFile.name,
        storagePath: path,
        isClientVisible: docClientVisible,
      });
      setDocuments((prev) => [created, ...prev]);
      setDocumentFile(null);
      setDocClientVisible(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-[-0.01em] text-foreground">
          <History className="h-4 w-4 text-muted-foreground" />
          Case Timeline
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={viewMode} onValueChange={(v) => v && setViewMode(v as typeof viewMode)}>
            <TabsList variant="line">
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="interactions">Interactions</TabsTrigger>
              <TabsTrigger value="commitments">Commitments</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
            </TabsList>
          </Tabs>
          <BookFollowUpDialog
            caseId={caseId}
            onBooked={(appointment) => setSessionList((prev) => [appointment, ...prev])}
          />
        </div>
      </div>

      {viewMode === "appointments" &&
        (sortedSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No appointments yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {sortedSessions.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                caseId={caseId}
                appointment={appointment}
                notes={notesByAppointment.get(appointment.id) ?? []}
                commitments={commitmentsByAppointment.get(appointment.id) ?? []}
                tasks={tasksByAppointment.get(appointment.id) ?? []}
                documents={documentsByAppointment.get(appointment.id) ?? []}
                onNoteAdded={(note) => setInteractions((prev) => [note, ...prev])}
                onCommitmentAdded={(c) => setCommitments((prev) => [c, ...prev])}
                onTaskAdded={(t) => setTasks((prev) => [t, ...prev])}
                onDocumentAdded={(d) => setDocuments((prev) => [d, ...prev])}
              />
            ))}
          </div>
        ))}

      {viewMode === "interactions" && (
        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="flex flex-col gap-2 border-b border-border pb-5">
              <Textarea
                placeholder="Add an ad-hoc note, or use the mic to dictate..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="w-fit"
                  onClick={handleComposeStandalone}
                  disabled={!draft.trim() || submitting}
                >
                  Add
                </Button>
                <VoiceTranscribeButton
                  label="Dictate"
                  onTranscript={(text) => setDraft((prev) => (prev ? `${prev} ${text}` : text))}
                />
                <div className="flex items-center gap-2">
                  <Switch
                    id="flat-note-visible"
                    checked={isClientVisible}
                    onCheckedChange={setIsClientVisible}
                  />
                  <Label htmlFor="flat-note-visible" className="text-xs text-muted-foreground">
                    Visible to client
                  </Label>
                </div>
              </div>
            </div>
            {interactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No interactions logged yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {interactions.map((i) => (
                  <NoteRow
                    key={i.id}
                    interaction={i}
                    commitments={[]}
                    tasks={[]}
                    appointmentLabel={appointmentLabel(i.appointmentId)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {viewMode === "commitments" && (
        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="flex flex-col gap-2 border-b border-border pb-5">
              <Textarea
                placeholder="Add a standalone commitment..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <Button
                size="sm"
                className="w-fit"
                onClick={handleComposeStandalone}
                disabled={!draft.trim() || submitting}
              >
                Add
              </Button>
            </div>
            {commitments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No commitments logged yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {commitments.map((c) => (
                  <CommitmentRow
                    key={c.id}
                    commitment={c}
                    appointmentLabel={appointmentLabel(c.appointmentId)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {viewMode === "tasks" && (
        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="flex flex-col gap-2 border-b border-border pb-5">
              <Textarea
                placeholder="Add a standalone task..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <Button
                size="sm"
                className="w-fit"
                onClick={handleComposeStandalone}
                disabled={!draft.trim() || submitting}
              >
                Add
              </Button>
            </div>
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks logged yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {tasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    appointmentLabel={appointmentLabel(t.appointmentId)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 border-b border-border pb-5">
            <Input type="file" onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)} />
            <div className="flex items-center gap-2">
              <Switch
                id="case-doc-visible"
                checked={docClientVisible}
                onCheckedChange={setDocClientVisible}
              />
              <Label htmlFor="case-doc-visible" className="text-xs text-muted-foreground">
                Visible to client
              </Label>
            </div>
            <Button
              size="sm"
              className="w-fit gap-2"
              onClick={handleUploadStandaloneDocument}
              disabled={!documentFile || submitting}
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Upload document
            </Button>
          </div>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {documents.map((d) => (
                <DocumentRow
                  key={d.id}
                  caseId={caseId}
                  document={d}
                  appointmentLabel={appointmentLabel(d.appointmentId)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
