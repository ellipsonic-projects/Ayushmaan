"use client";

import { useState } from "react";
import Link from "next/link";
import { ClipboardCheck, Download, Eye, FileText, Files, ListTodo } from "lucide-react";

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
import type { ClientCaseDocument } from "@/lib/api/client-documents.server";
import { getClientDocumentDownloadUrl } from "@/lib/api/client-documents.client";
import type { ClientFormSubmission } from "@/lib/api/client-form-submissions.server";
import type { SharedTemplateItem } from "@/lib/api/shared-templates.server";
import type { ClientCaseTask } from "@/lib/api/client-tasks.server";
import { listSchemaFields, formatAnswer } from "@/lib/forms/schema-fields";

export interface ClientCaseOption {
  id: string;
  tenantId: string;
  tenantSlug: string;
  consultantName: string;
}

interface Props {
  cases: ClientCaseOption[];
  documentsByCase: Record<string, ClientCaseDocument[]>;
  formSubmissionsByCase: Record<string, ClientFormSubmission[]>;
  sharedTemplatesByCase: Record<string, SharedTemplateItem[]>;
  tasksByCase: Record<string, ClientCaseTask[]>;
}

type Row =
  | { kind: "document"; caseOption: ClientCaseOption; document: ClientCaseDocument }
  | { kind: "form"; caseOption: ClientCaseOption; submission: ClientFormSubmission }
  | { kind: "template"; caseOption: ClientCaseOption; share: SharedTemplateItem }
  | { kind: "task"; caseOption: ClientCaseOption; task: ClientCaseTask };

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

export default function ClientDocumentationView({
  cases,
  documentsByCase,
  formSubmissionsByCase,
  sharedTemplatesByCase,
  tasksByCase,
}: Props) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState<ClientFormSubmission | null>(null);
  const [openTemplate, setOpenTemplate] = useState<SharedTemplateItem | null>(null);

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

  async function handleDownload(caseOption: ClientCaseOption, doc: ClientCaseDocument) {
    setDownloadingId(doc.id);
    try {
      const url = await getClientDocumentDownloadUrl(
        caseOption.tenantId,
        caseOption.tenantSlug,
        caseOption.id,
        doc.id
      );
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Couldn't get a download link. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Documentation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tasks, documents, and forms your care team has sent you
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shared documents & tasks</CardTitle>
          <CardDescription>
            {rows.length} items · {openTaskCount} task{openTaskCount === 1 ? "" : "s"} pending
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {rows.length === 0 && (
            <p className="py-3 text-sm text-muted-foreground">Nothing shared with you yet.</p>
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
                        Shared by {caseOption.consultantName} ·{" "}
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
                        Requested by {caseOption.consultantName} ·{" "}
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
                      {submission.status === "PENDING"
                        ? "Awaiting your response"
                        : submission.status}
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
                        Assigned by {caseOption.consultantName}
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
                    {task.status !== "COMPLETED" && (
                      <Button variant="outline" size="sm" className="gap-1.5" asChild>
                        <Link href="/client/tasks">
                          <Eye className="h-3.5 w-3.5" />
                          Complete task
                        </Link>
                      </Button>
                    )}
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
                      Shared by {caseOption.consultantName} ·{" "}
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
                You haven&apos;t filled this form out yet — check the link sent to you by email or
                WhatsApp.
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
    </div>
  );
}
