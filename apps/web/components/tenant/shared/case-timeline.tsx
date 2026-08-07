"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  Circle,
  Clock3,
  Download,
  FileText,
  History,
  Loader2,
  MessageSquare,
  Phone,
  Search,
  ShieldAlert,
  StickyNote,
  Upload,
  Users,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VoiceTranscribeButton } from "@/components/tenant/consultant/session-detail/voice-transcribe-button";
import { cn } from "@/lib/utils";
import {
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
  InteractionType,
  TaskDbStatus,
} from "@/lib/api/case-detail.server";

type TimelineKind = "session" | "interaction" | "commitment" | "task" | "document";

interface BaseItem {
  id: string;
  date: string;
}

interface SessionItem extends BaseItem {
  kind: "session";
  data: CaseSession;
}
interface InteractionItem extends BaseItem {
  kind: "interaction";
  data: CaseInteraction;
}
interface CommitmentItem extends BaseItem {
  kind: "commitment";
  data: CaseCommitment;
}
interface TaskItem extends BaseItem {
  kind: "task";
  data: CaseTask;
}
interface DocumentItem extends BaseItem {
  kind: "document";
  data: CaseDocument;
}

type TimelineItem = SessionItem | InteractionItem | CommitmentItem | TaskItem | DocumentItem;

const kindTabs: { value: "All" | TimelineKind; label: string }[] = [
  { value: "All", label: "All" },
  { value: "session", label: "Sessions" },
  { value: "interaction", label: "Notes" },
  { value: "commitment", label: "Commitments" },
  { value: "task", label: "Tasks" },
  { value: "document", label: "Documents" },
];

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

const interactionTypeIcon: Record<InteractionType, typeof Phone> = {
  CALL_LOG: Phone,
  SESSION_NOTE: Users,
  MESSAGE_LOG: MessageSquare,
  AD_HOC_NOTE: StickyNote,
};
const interactionTypeLabel: Record<InteractionType, string> = {
  CALL_LOG: "Call",
  SESSION_NOTE: "Session Note",
  MESSAGE_LOG: "Message",
  AD_HOC_NOTE: "Note",
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

function searchText(item: TimelineItem): string {
  switch (item.kind) {
    case "session":
      return sessionStatusLabel[item.data.status];
    case "interaction":
      return `${interactionTypeLabel[item.data.type]} ${item.data.notes}`;
    case "commitment":
      return `${item.data.title} ${item.data.description ?? ""}`;
    case "task":
      return item.data.title;
    case "document":
      return item.data.fileName;
  }
}

function mergeTimeline(input: {
  sessions: CaseSession[];
  interactions: CaseInteraction[];
  commitments: CaseCommitment[];
  tasks: CaseTask[];
  documents: CaseDocument[];
}): TimelineItem[] {
  const items: TimelineItem[] = [
    ...input.sessions.map((data): SessionItem => ({
      kind: "session",
      id: data.id,
      date: data.scheduledStart,
      data,
    })),
    ...input.interactions.map((data): InteractionItem => ({
      kind: "interaction",
      id: data.id,
      date: data.createdAt,
      data,
    })),
    ...input.commitments.map((data): CommitmentItem => ({
      kind: "commitment",
      id: data.id,
      date: data.createdAt,
      data,
    })),
    ...input.tasks.map((data): TaskItem => ({
      kind: "task",
      id: data.id,
      date: data.createdAt,
      data,
    })),
    ...input.documents.map((data): DocumentItem => ({
      kind: "document",
      id: data.id,
      date: data.createdAt,
      data,
    })),
  ];
  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const PAGE_SIZE = 20;

export function CaseTimeline({
  caseId,
  sessions,
  interactions: initialInteractions,
  commitments: initialCommitments,
  tasks: initialTasks,
  documents: initialDocuments,
  readOnly = false,
}: {
  caseId: string;
  sessions: CaseSession[];
  interactions: CaseInteraction[];
  commitments: CaseCommitment[];
  tasks: CaseTask[];
  documents: CaseDocument[];
  readOnly?: boolean;
}) {
  const [interactions, setInteractions] = useState(initialInteractions);
  const [commitments, setCommitments] = useState(initialCommitments);
  const [tasks, setTasks] = useState(initialTasks);
  const [documents, setDocuments] = useState(initialDocuments);

  const [kindFilter, setKindFilter] = useState<"All" | TimelineKind>("All");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [composeType, setComposeType] = useState<
    "interaction" | "commitment" | "task" | "document"
  >("interaction");
  const [interactionType, setInteractionType] = useState<InteractionType>("AD_HOC_NOTE");
  const [isClientVisible, setIsClientVisible] = useState(false);
  const [draft, setDraft] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const allItems = useMemo(
    () => mergeTimeline({ sessions, interactions, commitments, tasks, documents }),
    [sessions, interactions, commitments, tasks, documents]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems.filter((item) => {
      if (kindFilter !== "All" && item.kind !== kindFilter) return false;
      if (!q) return true;
      return searchText(item).toLowerCase().includes(q);
    });
  }, [allItems, kindFilter, query]);

  const visible = filtered.slice(0, visibleCount);

  async function handleCompose() {
    const content = draft.trim();
    if (!content) return;

    setSubmitting(true);
    try {
      if (composeType === "interaction") {
        const created = await createInteraction(caseId, {
          type: interactionType,
          notes: content,
          isClientVisible,
        });
        setInteractions((prev) => [created, ...prev]);
      } else if (composeType === "commitment") {
        const created = await createCommitment(caseId, {
          title: content.length > 60 ? `${content.slice(0, 60)}...` : content,
          description: content,
        });
        setCommitments((prev) => [created, ...prev]);
      } else {
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
      });
      setDocuments((prev) => [created, ...prev]);
      setDocumentFile(null);
      setIsClientVisible(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card data-tour="client-case-timeline">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          Case Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {!readOnly && (
          <div className="flex flex-col gap-2 border-b border-border pb-5">
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

            {composeType === "interaction" && (
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  value={interactionType}
                  onValueChange={(v) => v && setInteractionType(v as InteractionType)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AD_HOC_NOTE">Note</SelectItem>
                    <SelectItem value="CALL_LOG">Call</SelectItem>
                    <SelectItem value="MESSAGE_LOG">Message</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch
                    id="timeline-visible"
                    checked={isClientVisible}
                    onCheckedChange={setIsClientVisible}
                  />
                  <Label htmlFor="timeline-visible" className="text-xs text-muted-foreground">
                    Visible to client
                  </Label>
                </div>
              </div>
            )}

            {composeType === "document" ? (
              <div className="flex flex-col gap-2">
                <Input type="file" onChange={(e) => setDocumentFile(e.target.files?.[0] ?? null)} />
                <div className="flex items-center gap-2">
                  <Switch
                    id="timeline-doc-visible"
                    checked={isClientVisible}
                    onCheckedChange={setIsClientVisible}
                  />
                  <Label htmlFor="timeline-doc-visible" className="text-xs text-muted-foreground">
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
                  placeholder="Add to the timeline, or use the mic to dictate..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="w-fit"
                    onClick={handleCompose}
                    disabled={!draft.trim() || submitting}
                  >
                    Add to timeline
                  </Button>
                  <VoiceTranscribeButton
                    label="Dictate"
                    onTranscript={(text) => setDraft((prev) => (prev ? `${prev} ${text}` : text))}
                  />
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={kindFilter}
            onValueChange={(v) => {
              if (!v) return;
              setKindFilter(v as "All" | TimelineKind);
              setVisibleCount(PAGE_SIZE);
            }}
          >
            <TabsList variant="line">
              {kindTabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search timeline..."
              className="h-9 pl-9"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing to show yet.</p>
        ) : (
          <ol className="flex flex-col gap-5">
            {visible.map((item, index) => (
              <TimelineRow
                key={`${item.kind}-${item.id}`}
                item={item}
                caseId={caseId}
                readOnly={readOnly}
                isLast={index === visible.length - 1}
              />
            ))}
          </ol>
        )}

        {visibleCount < filtered.length && (
          <Button variant="outline" size="sm" onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>
            Load more
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function TimelineRow({
  item,
  caseId,
  readOnly,
  isLast,
}: {
  item: TimelineItem;
  caseId: string;
  readOnly: boolean;
  isLast: boolean;
}) {
  const { icon: Icon, badgeClass, content } = renderItem(item, caseId, readOnly);

  return (
    <li className="relative flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
            badgeClass
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        {!isLast && <span className="mt-1 w-px flex-1 bg-border" aria-hidden />}
      </div>
      <div className="min-w-0 flex-1 pb-1">{content}</div>
    </li>
  );
}

function renderItem(
  item: TimelineItem,
  caseId: string,
  readOnly: boolean
): {
  icon: typeof Clock3;
  badgeClass: string;
  content: React.ReactNode;
} {
  if (item.kind === "session") {
    const s = item.data;
    // The consultant-only sessions detail page doesn't exist under the
    // Client app's route tree, so the read-only (client) timeline must not
    // link there — it would be a dead link.
    const sessionDate = format(new Date(s.scheduledStart), "EEE, d MMM");
    return {
      icon: sessionStatusIcon[s.status],
      badgeClass: sessionStatusBadgeClass[s.status],
      content: (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {readOnly ? (
              <span className="text-sm font-medium text-foreground">{sessionDate}</span>
            ) : (
              <Link
                href={`../../sessions/${s.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {sessionDate}
              </Link>
            )}
            <Badge variant="outline" className={sessionStatusBadgeClass[s.status]}>
              {sessionStatusLabel[s.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(new Date(s.scheduledStart), "h:mm a")} &ndash;{" "}
            {format(new Date(s.scheduledEnd), "h:mm a")}
          </p>
        </>
      ),
    };
  }

  if (item.kind === "interaction") {
    const i = item.data;
    return {
      icon: interactionTypeIcon[i.type],
      badgeClass: "",
      content: (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-muted-foreground">
              {interactionTypeLabel[i.type]}
            </Badge>
            {!i.isClientVisible && (
              <Badge variant="secondary" className="text-muted-foreground">
                Internal
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{i.notes}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(i.createdAt), { addSuffix: true })}
          </p>
        </>
      ),
    };
  }

  if (item.kind === "commitment") {
    const c = item.data;
    const status = commitmentDisplayStatus(c);
    return {
      icon: commitmentStatusIcon[c.status],
      badgeClass: status.className,
      content: (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{c.title}</p>
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
          </div>
          {c.description && <p className="mt-1 text-sm text-muted-foreground">{c.description}</p>}
          {c.dueAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Due {format(new Date(c.dueAt), "EEE, dd MMM · h:mm a")}
            </p>
          )}
        </>
      ),
    };
  }

  if (item.kind === "task") {
    const t = item.data;
    return {
      icon: taskStatusIcon[t.status],
      badgeClass: taskStatusBadgeClass[t.status],
      content: (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{t.title}</p>
            <Badge variant="outline" className={taskStatusBadgeClass[t.status]}>
              {taskStatusLabel[t.status]}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Assigned to {t.assignedTo === "CONSULTANT" ? "Consultant" : "Client"}
            {t.dueAt && ` · Due ${format(new Date(t.dueAt), "EEE, dd MMM · h:mm a")}`}
          </p>
        </>
      ),
    };
  }

  const d = item.data;
  return {
    icon: FileText,
    badgeClass: "",
    content: (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-foreground">{d.fileName}</p>
          {!d.isClientVisible && (
            <Badge variant="secondary" className="text-muted-foreground">
              Internal
            </Badge>
          )}
          <DocumentDownloadButton caseId={caseId} documentId={d.id} fileName={d.fileName} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {fileType(d.fileName)} &middot; {format(new Date(d.createdAt), "dd MMM yyyy")}
        </p>
      </>
    ),
  };
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
