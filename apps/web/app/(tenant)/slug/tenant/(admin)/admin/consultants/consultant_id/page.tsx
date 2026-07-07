import { ConsultantDetailHeader } from "@/components/tenant/admin/consultants-directory/consultant-detail-header";
import { ConsultantDetailForm } from "@/components/tenant/admin/consultants-directory/consultant-detail-form";

// GET /api/tenants/:tenantId/consultants/:consultantId — apps/api reads
// consultant_profiles joined with users/cases/grievances for this view.
const mockConsultant = {
  id: "CON-1042",
  fullName: "Dr. Amit Shah",
  email: "amit.shah@ayushman.health",
  category: "MEDICAL",
  subSpecialization: "Cardiology",
  bio: "15+ years treating cardiovascular conditions, with a focus on preventive care and post-operative recovery.",
  consultationFee: "1500",
  currency: "INR",
  languages: ["English", "Hindi"],
  isAcceptingNewClients: true,
  accountStatus: "ACTIVE" as const,
  caseCount: 86,
  disputeCount: 1,
};

export default function ConsultantDetailPage() {
  return (
    <div className="flex flex-col gap-6">
      <ConsultantDetailHeader
        fullName={mockConsultant.fullName}
        consultantId={mockConsultant.id}
        accountStatus={mockConsultant.accountStatus}
      />
      <ConsultantDetailForm consultant={mockConsultant} />
    </div>
  );
}
