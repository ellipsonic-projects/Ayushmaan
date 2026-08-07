import { format } from "date-fns";
import { FileText, Download, FolderOpen } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DocumentItem } from "@/components/tenant/admin/session-detail/session-detail-data";

export function ClientDocuments({ documents }: { documents: DocumentItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          Client Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{doc.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.fileType} &middot; {doc.sizeLabel} &middot;{" "}
                  {format(doc.uploadedAt, "dd MMM yyyy")}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!doc.isClientVisible && (
                <Badge variant="secondary" className="text-muted-foreground">
                  Internal
                </Badge>
              )}
              <Button variant="ghost" size="icon-sm" aria-label={`Download ${doc.fileName}`}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
