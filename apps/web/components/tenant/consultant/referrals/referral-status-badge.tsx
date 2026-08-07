import { Badge } from "@/components/ui/badge";
import type { ReferralStatus } from "@/lib/api/consultant-referrals.server";

const statusLabel: Record<ReferralStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
};

const statusBadgeClass: Record<ReferralStatus, string> = {
  PENDING:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  ACCEPTED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  DECLINED: "border-border text-muted-foreground",
};

export function ReferralStatusBadge({ status }: { status: ReferralStatus }) {
  return (
    <Badge variant="outline" className={statusBadgeClass[status]}>
      {statusLabel[status]}
    </Badge>
  );
}
