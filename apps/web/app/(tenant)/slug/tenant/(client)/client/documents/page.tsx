import {
  AlertTriangle,
  Download,
  FileText,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type Consultant = {
  id: string;
  name: string;
  role: string;
  initials: string;
};

const consultants: Consultant[] = [
  { id: "aris-thorne", name: "Dr. Aris Thorne", role: "Primary Consultant", initials: "AT" },
  { id: "mira-kapoor", name: "Dr. Mira Kapoor", role: "Therapist", initials: "MK" },
  { id: "rahul-menon", name: "Rahul Menon", role: "Care Coordinator", initials: "RM" },
];

type Doc = {
  id: string;
  name: string;
  size: string;
  date: string;
  type: string;
  permissions: Record<string, { view: boolean; edit: boolean; download: boolean }>;
};

const documents: Doc[] = [
  {
    id: "id-proof",
    name: "Identity Proof – Aadhar Card",
    size: "1.2 MB",
    date: "Jul 5, 2026",
    type: "PDF",
    permissions: {
      "aris-thorne": { view: true, edit: false, download: true },
      "mira-kapoor": { view: true, edit: false, download: false },
      "rahul-menon": { view: false, edit: false, download: false },
    },
  },
  {
    id: "medical-history",
    name: "Medical History Summary",
    size: "480 KB",
    date: "Jun 28, 2026",
    type: "DOCX",
    permissions: {
      "aris-thorne": { view: true, edit: true, download: true },
      "mira-kapoor": { view: true, edit: false, download: true },
      "rahul-menon": { view: false, edit: false, download: false },
    },
  },
  {
    id: "insurance-card",
    name: "Insurance Card – Front & Back",
    size: "890 KB",
    date: "Jun 15, 2026",
    type: "JPG",
    permissions: {
      "aris-thorne": { view: true, edit: false, download: false },
      "mira-kapoor": { view: false, edit: false, download: false },
      "rahul-menon": { view: true, edit: false, download: true },
    },
  },
];

function UploadWarning() {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-amber-700 dark:text-amber-400">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="text-xs leading-relaxed">
        Documents you upload will automatically be viewable by Consultants.
        You can fine-tune edit and download access for each consultant after
        uploading.
      </p>
    </div>
  );
}

function UploadDocumentDialog() {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button className="gap-1.5">
            <Upload className="h-4 w-4" />
            Upload Document
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload document</DialogTitle>
          <DialogDescription>
            Add a file to share with your care team
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <UploadWarning />

          <div className="grid gap-1.5">
            <Label htmlFor="doc-file">File</Label>
            <Input id="doc-file" type="file" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="doc-note">Note (optional)</Label>
            <Textarea
              id="doc-note"
              placeholder="Add context about this document for your consultants"
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button type="button" className="gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManageAccessDialog({ doc }: { doc: Doc }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Manage access
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage access</DialogTitle>
          <DialogDescription>{doc.name}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col divide-y divide-border">
          {consultants.map((c) => {
            const perm = doc.permissions[c.id];
            return (
              <div key={c.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {c.initials}
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-medium text-foreground">
                      {c.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.role}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-lg border border-border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`${doc.id}-${c.id}-view`} className="text-xs">
                      View
                    </Label>
                    <Switch
                      id={`${doc.id}-${c.id}-view`}
                      defaultChecked={perm.view}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`${doc.id}-${c.id}-edit`} className="text-xs">
                      Edit
                    </Label>
                    <Switch
                      id={`${doc.id}-${c.id}-edit`}
                      defaultChecked={perm.edit}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor={`${doc.id}-${c.id}-download`} className="text-xs">
                      Download
                    </Label>
                    <Switch
                      id={`${doc.id}-${c.id}-download`}
                      defaultChecked={perm.download}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button type="button">Save permissions</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ClientDocumentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Documents</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload documents and control what your consultants can do with them
          </p>
        </div>
        <UploadDocumentDialog />
      </div>

      <UploadWarning />

      <Card>
        <CardHeader>
          <CardTitle>Uploaded documents</CardTitle>
          <CardDescription>{documents.length} documents</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {documents.map((doc) => {
            const sharedWith = Object.values(doc.permissions).filter(
              (p) => p.view
            ).length;
            return (
              <div
                key={doc.id}
                className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-medium text-foreground">
                      {doc.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {doc.size} · {doc.date} · {doc.type}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    Shared with {sharedWith}/{consultants.length}
                  </Badge>
                  <ManageAccessDialog doc={doc} />
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
