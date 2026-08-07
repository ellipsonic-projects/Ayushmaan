import { notFound } from "next/navigation";

import { ConsultantDetailHeader } from "@/components/tenant/admin/consultants-directory/consultant-detail-header";
import { ConsultantDetailForm } from "@/components/tenant/admin/consultants-directory/consultant-detail-form";
import { ConsultantWeeklyHours } from "@/components/tenant/admin/consultants-directory/consultant-weekly-hours";
import {
  getTenantConsultant,
  getConsultantVerificationDocuments,
  getTenantConsultantAvailability,
} from "@/lib/api/consultants.server";

export default async function ConsultantDetailPage({
  params,
}: {
  params: Promise<{ consultantId: string }>;
}) {
  const { consultantId } = await params;
  const [consultant, documents, availability] = await Promise.all([
    getTenantConsultant(consultantId),
    getConsultantVerificationDocuments(consultantId),
    getTenantConsultantAvailability(consultantId),
  ]);

  if (!consultant) notFound();

  return (
    <div className="flex flex-col gap-6">
      <ConsultantDetailHeader
        fullName={consultant.fullName}
        consultantId={consultant.id}
        accountStatus={consultant.user.accountStatus === "SUSPENDED" ? "SUSPENDED" : "ACTIVE"}
      />
      <ConsultantDetailForm consultant={consultant} documents={documents} />
      <ConsultantWeeklyHours slots={availability} />
    </div>
  );
}
