import { Download, Eye, FileText, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const documents = [
  {
    name: "Treatment Plan – July 2026",
    sharedBy: "Dr. Aris Thorne",
    date: "Jul 2, 2026",
    type: "PDF",
    status: "New",
  },
  {
    name: "Intake Assessment Report",
    sharedBy: "Dr. Aris Thorne",
    date: "Jun 30, 2026",
    type: "PDF",
    status: "Viewed",
  },
  {
    name: "Consent Form – Telehealth",
    sharedBy: "Acme Industries",
    date: "Jun 5, 2026",
    type: "DOCX",
    status: "Signed",
  },
  {
    name: "Session Notes Summary",
    sharedBy: "Dr. Mira Kapoor",
    date: "Jun 17, 2026",
    type: "PDF",
    status: "Viewed",
  },
  {
    name: "Insurance Claim Receipt",
    sharedBy: "Acme Industries",
    date: "Jun 12, 2026",
    type: "PDF",
    status: "Viewed",
  },
];

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  New: "default",
  Signed: "secondary",
  Viewed: "outline",
};

export default function ClientDocumentationPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Documentation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Documents and forms shared with you by your care team
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Shared documents</CardTitle>
          <CardDescription>{documents.length} documents available</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y divide-border">
          {documents.map((doc) => (
            <div
              key={doc.name}
              className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-medium text-foreground">{doc.name}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    Shared by {doc.sharedBy} · {doc.date} · {doc.type}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge variant={statusVariant[doc.status] ?? "outline"}>{doc.status}</Badge>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  View
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  Reupload
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
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
