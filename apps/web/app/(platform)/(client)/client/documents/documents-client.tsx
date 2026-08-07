"use client";

import { useState } from "react";
import { AlertTriangle, Download, FileText, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ClientCaseDocument } from "@/lib/api/client-documents.server";
import {
  createClientDocument,
  deleteClientDocument,
  getClientDocumentDownloadUrl,
  requestDocumentUploadUrl,
  uploadClientDocumentFile,
} from "@/lib/api/client-documents.client";

export interface ClientCaseOption {
  id: string;
  tenantId: string;
  tenantSlug: string;
  consultantName: string;
}

interface Props {
  cases: ClientCaseOption[];
  initialDocuments: Record<string, ClientCaseDocument[]>;
}

function UploadWarning() {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-amber-700 dark:text-amber-400">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="text-xs leading-relaxed">
        Documents you upload are only shared with the consultant on the case you attach them to. No
        one else can view them.
      </p>
    </div>
  );
}

export default function ClientDocumentsView({ cases, initialDocuments }: Props) {
  const [documentsByCase, setDocumentsByCase] =
    useState<Record<string, ClientCaseDocument[]>>(initialDocuments);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(cases[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    caseOption: ClientCaseOption;
    doc: ClientCaseDocument;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const caseById = new Map(cases.map((c) => [c.id, c]));

  async function handleUpload() {
    const target = caseById.get(selectedCaseId);
    if (!target || !file) return;

    setUploading(true);
    setError(null);
    try {
      const { path, signedUrl, token } = await requestDocumentUploadUrl(
        target.tenantId,
        target.tenantSlug,
        target.id,
        file.name
      );
      void signedUrl;
      await uploadClientDocumentFile(path, token, file);
      const created = await createClientDocument(target.tenantId, target.tenantSlug, target.id, {
        fileName: file.name,
        storagePath: path,
      });
      setDocumentsByCase((prev) => ({
        ...prev,
        [target.id]: [created, ...(prev[target.id] ?? [])],
      }));
      setFile(null);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

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

  async function handleDelete() {
    if (!pendingDelete) return;
    const { caseOption, doc } = pendingDelete;
    setDeletingId(doc.id);
    try {
      await deleteClientDocument(caseOption.tenantId, caseOption.tenantSlug, caseOption.id, doc.id);
      setDocumentsByCase((prev) => ({
        ...prev,
        [caseOption.id]: (prev[caseOption.id] ?? []).filter((d) => d.id !== doc.id),
      }));
      setPendingDelete(null);
    } catch {
      setError("Couldn't delete the document. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const totalDocuments = cases.reduce((sum, c) => sum + (documentsByCase[c.id]?.length ?? 0), 0);

  return (
    <div className="flex flex-col gap-6" data-tour="client-documents-list">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Documents</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Share documents with your consultants — each document is only visible to the consultant
            on its case
          </p>
        </div>
        <Dialog>
          <DialogTrigger
            render={
              <Button className="gap-1.5" disabled={cases.length === 0}>
                <Upload className="h-4 w-4" />
                Upload Document
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload document</DialogTitle>
              <DialogDescription>Add a file to share with a consultant</DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <UploadWarning />

              <div className="grid gap-1.5">
                <Label htmlFor="doc-case">Share with</Label>
                <Select
                  value={selectedCaseId}
                  onValueChange={(value) => setSelectedCaseId(value ?? "")}
                >
                  <SelectTrigger id="doc-case" className="w-full">
                    <SelectValue placeholder="Select a consultant" />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.consultantName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="doc-file">File</Label>
                <Input
                  id="doc-file"
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <Button
                type="button"
                className="gap-1.5"
                disabled={!file || !selectedCaseId || uploading}
                onClick={handleUpload}
              >
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "Uploading…" : "Upload"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded documents</CardTitle>
          <CardDescription>{totalDocuments} documents</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {totalDocuments === 0 && (
            <p className="py-3 text-sm text-muted-foreground">No documents uploaded yet.</p>
          )}
          {cases.flatMap((c) =>
            (documentsByCase[c.id] ?? []).map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-medium text-foreground">{doc.fileName}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge variant="outline">Shared with {c.consultantName}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={downloadingId === doc.id}
                    onClick={() => handleDownload(c, doc)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                  {doc.uploadedByRole === "CLIENT" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      disabled={deletingId === doc.id}
                      onClick={() => setPendingDelete({ caseOption: c, doc })}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete document</DialogTitle>
            <DialogDescription>
              {pendingDelete ? `Delete "${pendingDelete.doc.fileName}"? This can't be undone.` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingId !== null}
              onClick={handleDelete}
            >
              {deletingId ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
