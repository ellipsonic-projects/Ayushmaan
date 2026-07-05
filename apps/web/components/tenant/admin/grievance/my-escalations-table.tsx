import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Grievance.status — schema §1.3
type Status = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

type Escalation = {
  id: string;
  subject: string;
  category: string;
  severity: Severity;
  status: Status;
  submittedAt: string;
};

const escalations: Escalation[] = [
  {
    id: "GRV-7734",
    subject: "Billing / Payouts",
    category: "Billing Dispute",
    severity: "HIGH",
    status: "UNDER_REVIEW",
    submittedAt: "Jul 2, 2026 · 10:15 AM",
  },
  {
    id: "GRV-7690",
    subject: "Platform Issue",
    category: "Data Privacy",
    severity: "CRITICAL",
    status: "RESOLVED",
    submittedAt: "Jun 21, 2026 · 3:40 PM",
  },
  {
    id: "GRV-7612",
    subject: "Other",
    category: "Other",
    severity: "LOW",
    status: "DISMISSED",
    submittedAt: "Jun 5, 2026 · 9:05 AM",
  },
];

const statusClass: Record<Status, string> = {
  OPEN: "border-border bg-muted text-foreground",
  UNDER_REVIEW:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  RESOLVED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  DISMISSED:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
};

const statusLabel: Record<Status, string> = {
  OPEN: "Open",
  UNDER_REVIEW: "Under Review",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

const severityClass: Record<Severity, string> = {
  LOW: "text-muted-foreground",
  MEDIUM: "text-muted-foreground",
  HIGH: "text-amber-600 dark:text-amber-500",
  CRITICAL: "text-red-600 dark:text-red-500",
};

const severityDot: Record<Severity, string> = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-slate-400",
  HIGH: "bg-amber-500",
  CRITICAL: "bg-red-500",
};

export function MyEscalationsTable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Your Past Escalations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Escalation ID</th>
                <th className="py-2 pr-4 font-medium">Subject</th>
                <th className="py-2 pr-4 font-medium">Category &amp; Severity</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {escalations.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground">{e.id}</td>
                  <td className="py-3 pr-4 text-foreground">{e.subject}</td>
                  <td className="py-3 pr-4">
                    <p className="text-foreground">{e.category}</p>
                    <p
                      className={`mt-0.5 flex items-center gap-1.5 text-xs font-medium ${severityClass[e.severity]}`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${severityDot[e.severity]}`}
                      />
                      {e.severity}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant="outline" className={statusClass[e.status]}>
                      {statusLabel[e.status].toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {e.submittedAt}
                  </td>
                </tr>
              ))}
              {escalations.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    You haven&apos;t submitted any escalations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
