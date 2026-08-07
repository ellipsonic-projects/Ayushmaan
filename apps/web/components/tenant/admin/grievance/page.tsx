import { GrievanceHeader } from "@/components/tenant/admin/grievance/grievance-header";
import { RaiseGrievanceForm } from "@/components/tenant/admin/grievance/raise-grievance-form";
import { MyEscalationsTable } from "@/components/tenant/admin/grievance/my-escalations-table";
import { getMyGrievanceEscalations } from "@/lib/api/grievances.server";

export default async function TenantGrievancePage() {
  const escalations = await getMyGrievanceEscalations();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <GrievanceHeader />
      <RaiseGrievanceForm />
      <MyEscalationsTable escalations={escalations} />
    </div>
  );
}
