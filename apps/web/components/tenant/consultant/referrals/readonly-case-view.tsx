import { format } from "date-fns";
import {
  CalendarClock,
  FileText,
  ListTodo,
  MessageSquareText,
  ShieldAlert,
  Tag,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CaseDetailData } from "@/lib/api/case-detail.server";

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof FileText;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  );
}

// Renders a Case exactly as GET /cases/:caseId returns it, with no edit
// affordances — used when a consultant is viewing a case referred to them,
// before (or instead of) accepting it into their own caseload.
export function ReadonlyCaseView({ caseDetail }: { caseDetail: CaseDetailData }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Case Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Tag className="h-4 w-4" />
              {caseDetail.category}
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarClock className="h-4 w-4" />
              Opened {format(new Date(caseDetail.createdAt), "MMM d, yyyy")}
            </span>
          </div>
          {caseDetail.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {caseDetail.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {caseDetail.requirements && (
            <p className="whitespace-pre-wrap text-sm text-foreground">{caseDetail.requirements}</p>
          )}
        </CardContent>
      </Card>

      {caseDetail.interactions.length > 0 && (
        <Section
          icon={MessageSquareText}
          title={`Interactions (${caseDetail.interactions.length})`}
        >
          {caseDetail.interactions.map((i) => (
            <div key={i.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline">{i.type.replace(/_/g, " ")}</Badge>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(i.createdAt), "MMM d, yyyy")}
                </p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{i.notes}</p>
            </div>
          ))}
        </Section>
      )}

      {caseDetail.commitments.length > 0 && (
        <Section icon={ShieldAlert} title={`Commitments (${caseDetail.commitments.length})`}>
          {caseDetail.commitments.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{c.title}</p>
                {c.dueAt && (
                  <p className="text-xs text-muted-foreground">
                    Due {format(new Date(c.dueAt), "MMM d, yyyy")}
                  </p>
                )}
              </div>
              <Badge variant="outline">{c.status}</Badge>
            </div>
          ))}
        </Section>
      )}

      {caseDetail.tasks.length > 0 && (
        <Section icon={ListTodo} title={`Tasks (${caseDetail.tasks.length})`}>
          {caseDetail.tasks.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                {t.dueAt && (
                  <p className="text-xs text-muted-foreground">
                    Due {format(new Date(t.dueAt), "MMM d, yyyy")}
                  </p>
                )}
              </div>
              <Badge variant="outline">{t.status}</Badge>
            </div>
          ))}
        </Section>
      )}

      {caseDetail.documents.length > 0 && (
        <Section icon={FileText} title={`Documents (${caseDetail.documents.length})`}>
          {caseDetail.documents.map((d) => (
            <div key={d.id} className="flex items-center gap-2 rounded-lg border border-border p-3">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="truncate text-sm text-foreground">{d.fileName}</p>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
