"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Download, Eye, FileText, Files, ListTodo, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClientCaseDocument } from "@/lib/api/client-documents.server";
import { getClientDocumentDownloadUrl } from "@/lib/api/client-documents.client";
import type { ClientFormSubmission } from "@/lib/api/client-form-submissions.server";
import type { SharedTemplateItem } from "@/lib/api/shared-templates.server";
import { shareTemplateWithCase } from "@/lib/api/shared-templates.client";
import type { WorkflowTemplate } from "@/lib/api/workflow-templates.server";
import type { FormTemplate } from "@/lib/api/form-templates.server";
import type { ClientCaseTask } from "@/lib/api/client-tasks.server";
import { listSchemaFields, formatAnswer } from "@/lib/forms/schema-fields";

export interface ConsultantCaseOption {
  id: string;
  clientName: string;
}

interface Props {
  tenantId: string | null;
  tenantSlug: string | null;
  cases: ConsultantCaseOption[];
  documentsByCase: Record<string, ClientCaseDocument[]>;
  formSubmissionsByCase: Record<string, ClientFormSubmission[]>;
  sharedTemplatesByCase: Record<string, SharedTemplateItem[]>;
  tasksByCase: Record<string, ClientCaseTask[]>;
  messageTemplates: WorkflowTemplate[];
  formTemplates: FormTemplate[];
}

type Row =
  | { kind: "document"; caseOption: ConsultantCaseOption; document: ClientCaseDocument }
  | { kind: "form"; caseOption: ConsultantCaseOption; submission: ClientFormSubmission }
  | { kind: "template"; caseOption: ConsultantCaseOption; share: SharedTemplateItem }
  | { kind: "task"; caseOption: ConsultantCaseOption; task: ClientCaseTask };

const FORM_STATUS_BADGE: Record<ClientFormSubmission["status"], string> = {
  PENDING: "border-amber-500 text-amber-600",
  SUBMITTED: "border-emerald-600 text-emerald-600",
  EXPIRED: "text-muted-foreground",
};

const TASK_STATUS_BADGE: Record<ClientCaseTask["status"], string> = {
  OPEN: "text-muted-foreground",
  OVERDUE: "border-red-500 text-red-600",
  COMPLETED: "border-emerald-600 text-emerald-600",
};

const TASK_TYPE_LABEL: Record<NonNullable<ClientCaseTask["type"]>, string> = {
  UPLOAD_DOCUMENT: "Upload a document",
  FILL_FORM: "Fill out a form",
  WRITE_RESPONSE: "Write a response",
};

export default function ConsultantDocumentationView({
  tenantId,
  tenantSlug,
  cases,
  documentsByCase,
  formSubmissionsByCase,
  sharedTemplatesByCase,
  tasksByCase,
  messageTemplates,
  formTemplates,
}: Props) {
  const router = useRouter();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState<ClientFormSubmission | null>(null);
  const [openTemplate, setOpenTemplate] = useState<SharedTemplateItem | null>(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareCaseId, setShareCaseId] = useState<string>("");
  const [shareKind, setShareKind] = useState<"message" | "form">("message");
  const [shareTemplateId, setShareTemplateId] = useState<string>("");
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const rows: Row[] = cases.flatMap((c) => [
    ...(documentsByCase[c.id] ?? []).map((document): Row => ({
      kind: "document",
      caseOption: c,
      document,
    })),
    ...(formSubmissionsByCase[c.id] ?? []).map((submission): Row => ({
      kind: "form",
      caseOption: c,
      submission,
    })),
    ...(sharedTemplatesByCase[c.id] ?? []).map((share): Row => ({
      kind: "template",
      caseOption: c,
      share,
    })),
    ...(tasksByCase[c.id] ?? []).map((task): Row => ({
      kind: "task",
      caseOption: c,
      task,
    })),
  ]);
  const rowDate = (row: Row) =>
    row.kind === "document"
      ? row.document.createdAt
      : row.kind === "form"
        ? row.submission.createdAt
        : row.kind === "template"
          ? row.share.createdAt
          : row.task.createdAt;
  rows.sort((a, b) => new Date(rowDate(b)).getTime() - new Date(rowDate(a)).getTime());
  const openTaskCount = Object.values(tasksByCase)
    .flat()
    .filter((t) => t.status !== "COMPLETED").length;

  async function handleDownload(caseOption: ConsultantCaseOption, doc: ClientCaseDocument) {
    if (!tenantId || !tenantSlug) return;
    setDownloadingId(doc.id);
    try {
      const url = await getClientDocumentDownloadUrl(tenantId, tenantSlug, caseOption.id, doc.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Couldn't get a download link. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  }

  function openShareDialog() {
    setShareError(null);
    setShareCaseId(cases[0]?.id ?? "");
    setShareKind("message");
    setShareTemplateId(messageTemplates[0]?.id ?? "");
    setShareOpen(true);
  }

  async function handleShare() {
    if (!tenantId || !tenantSlug || !shareCaseId || !shareTemplateId) return;
    setSharing(true);
    setShareError(null);
    try {
      await shareTemplateWithCase(
        tenantId,
        tenantSlug,
        shareCaseId,
        shareKind === "message"
          ? { workflowTemplateId: shareTemplateId }
          : { formTemplateId: shareTemplateId }
      );
      setShareOpen(false);
      router.refresh();
    } catch {
      setShareError("Couldn't share this template. Please try again.");
    } finally {
      setSharing(false);
    }
  }

  const templateOptions = shareKind === "message" ? messageTemplates : formTemplates;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Documentation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Documents, forms, and templates shared with your clients
          </p>
        </div>
        <Button
          className="gap-1.5"
          disabled={!tenantId || cases.length === 0}
          onClick={openShareDialog}
        >
          <Share2 className="h-4 w-4" />
          Share template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shared documents & tasks</CardTitle>
          <CardDescription>
            {rows.length} items across your cases · {openTaskCount} client task
            {openTaskCount === 1 ? "" : "s"} pending
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {rows.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">Nothing shared yet.</p>
          )}
          {error && <p className="pb-2 text-xs text-destructive">{error}</p>}
          {rows.map((row) => {
            if (row.kind === "document") {
              const { document, caseOption } = row;
              return (
                <div
                  key={`doc-${document.id}`}
                  className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-sm font-medium text-foreground">
                        {document.fileName}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {caseOption.clientName} ·{" "}
                        {new Date(document.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      disabled={downloadingId === document.id}
                      onClick={() => handleDownload(caseOption, document)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </Button>
                  </div>
                </div>
              );
            }

            if (row.kind === "form") {
              const { submission, caseOption } = row;
              return (
                <div
                  key={`form-${submission.id}`}
                  className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-sm font-medium text-foreground">
                        {submission.formTemplate.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {caseOption.clientName} ·{" "}
                        {new Date(submission.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Badge variant="outline" className={FORM_STATUS_BADGE[submission.status]}>
                      {submission.status === "PENDING" ? "Awaiting response" : submission.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => setOpenForm(submission)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                  </div>
                </div>
              );
            }

            if (row.kind === "task") {
              const { task, caseOption } = row;
              return (
                <div
                  key={`task-${task.id}`}
                  className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <ListTodo className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-sm font-medium text-foreground">{task.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {caseOption.clientName}
                        {task.type && ` · ${TASK_TYPE_LABEL[task.type]}`}
                        {task.dueAt &&
                          ` · Due ${new Date(task.dueAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Badge variant="outline" className={TASK_STATUS_BADGE[task.status]}>
                      {task.status === "OPEN"
                        ? "Open"
                        : task.status === "OVERDUE"
                          ? "Overdue"
                          : "Completed"}
                    </Badge>
                  </div>
                </div>
              );
            }

            const { share, caseOption } = row;
            return (
              <div
                key={`template-${share.id}`}
                className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Files className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-medium text-foreground">
                      {share.templateName}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {caseOption.clientName} ·{" "}
                      {new Date(share.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setOpenTemplate(share)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={openForm !== null} onOpenChange={(next) => !next && setOpenForm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{openForm?.formTemplate.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {openForm?.status !== "SUBMITTED" ? (
              <p className="text-sm text-muted-foreground">
                The client hasn&apos;t filled this form out yet.
              </p>
            ) : (
              listSchemaFields(
                openForm.formTemplate.jsonSchema,
                openForm.formTemplate.uiSchema
              ).map((field) => (
                <div key={field.key} className="flex flex-col gap-0.5">
                  <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                  <p className="text-sm text-foreground">
                    {formatAnswer(openForm.answers[field.key])}
                  </p>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openTemplate !== null} onOpenChange={(next) => !next && setOpenTemplate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{openTemplate?.templateName}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {openTemplate?.renderedContent.jsonSchema ? (
              <>
                {openTemplate.renderedContent.header ? (
                  <div className="flex flex-col gap-0.5 border-b pb-2">
                    <p className="text-sm font-semibold text-foreground">
                      {openTemplate.renderedContent.header.organizationName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {openTemplate.renderedContent.header.consultantName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {openTemplate.renderedContent.header.contactNumber}
                    </p>
                  </div>
                ) : null}
                {listSchemaFields(
                  openTemplate.renderedContent.jsonSchema,
                  openTemplate.renderedContent.uiSchema
                ).map((field) => (
                  <div key={field.key} className="flex flex-col gap-0.5">
                    <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                    <p className="text-sm text-foreground">{field.type}</p>
                  </div>
                ))}
              </>
            ) : openTemplate?.renderedContent.html ? (
              <div
                className="text-sm text-foreground [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: openTemplate.renderedContent.html }}
              />
            ) : (
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {openTemplate?.renderedContent.text}
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share a template with a client</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">Case</p>
              <Select value={shareCaseId} onValueChange={(value) => setShareCaseId(value ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">Template type</p>
              <Select
                value={shareKind}
                onValueChange={(value) => {
                  const kind = value as "message" | "form";
                  setShareKind(kind);
                  const first = (kind === "message" ? messageTemplates : formTemplates)[0];
                  setShareTemplateId(first?.id ?? "");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="message">Message template</SelectItem>
                  <SelectItem value="form">Form template</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-medium text-muted-foreground">Template</p>
              <Select
                value={shareTemplateId}
                onValueChange={(value) => setShareTemplateId(value ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templateOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templateOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No {shareKind === "message" ? "message" : "form"} templates yet — create one on
                  the Templates page first.
                </p>
              )}
            </div>

            {shareError && <p className="text-xs text-destructive">{shareError}</p>}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button disabled={!shareCaseId || !shareTemplateId || sharing} onClick={handleShare}>
              {sharing ? "Sharing…" : "Share"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
