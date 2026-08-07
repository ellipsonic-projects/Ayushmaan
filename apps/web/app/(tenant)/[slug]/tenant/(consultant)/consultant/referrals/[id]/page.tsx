import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReferralStatusBadge } from "@/components/tenant/consultant/referrals/referral-status-badge";
import { ReferralActions } from "@/components/tenant/consultant/referrals/referral-actions";
import { ReadonlyCaseView } from "@/components/tenant/consultant/referrals/readonly-case-view";
import { getConsultantReferralDetail } from "@/lib/api/consultant-referrals.server";
import { getOwnConsultantProfile } from "@/lib/api/consultants.server";

export default async function ConsultantReferralDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [referral, ownConsultant] = await Promise.all([
    getConsultantReferralDetail(id),
    getOwnConsultantProfile(),
  ]);

  if (!referral) notFound();

  const isRecipient = ownConsultant?.id === referral.toConsultant?.id;

  return (
    <div data-tour="consultant-referral-detail" className="flex flex-col gap-4">
      <Button variant="ghost" size="sm" asChild className="w-fit text-muted-foreground">
        <Link href="../referrals">
          <ChevronLeft className="h-4 w-4" />
          Back to referrals
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-foreground">
              {referral.client?.fullName ?? "Referred case"}
            </h2>
            <ReferralStatusBadge status={referral.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isRecipient ? "Referred by" : "Referred to"}{" "}
            {(isRecipient ? referral.fromConsultant : referral.toConsultant)?.fullName ?? "—"} on{" "}
            {format(new Date(referral.createdAt), "MMM d, yyyy")}
          </p>
        </div>

        {isRecipient && referral.status === "PENDING" && (
          <ReferralActions referralId={referral.id} />
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-1.5 py-4">
          <p className="text-xs font-medium text-muted-foreground">Reason for referral</p>
          <p className="text-sm text-foreground">
            {referral.contextNote || "No reason was provided."}
          </p>
        </CardContent>
      </Card>

      {referral.status === "DECLINED" && referral.declineReason && (
        <Card>
          <CardContent className="flex flex-col gap-1.5 py-4">
            <p className="text-xs font-medium text-muted-foreground">Rejection reason</p>
            <p className="text-sm text-foreground">{referral.declineReason}</p>
          </CardContent>
        </Card>
      )}

      <ReadonlyCaseView caseDetail={referral.case} />
    </div>
  );
}
