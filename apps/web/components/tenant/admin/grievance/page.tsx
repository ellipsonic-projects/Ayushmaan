import { GrievanceHeader } from "@/components/tenant/admin/grievance/grievance-header";
import { RaiseGrievanceForm } from "@/components/tenant/admin/grievance/raise-grievance-form";
import { MyEscalationsTable } from "@/components/tenant/admin/grievance/my-escalations-table";

export default function TenantGrievancePage() {
  return (
    <div className="flex flex-col gap-6">
      <GrievanceHeader />
      <RaiseGrievanceForm />
      <MyEscalationsTable />
    </div>
  );
}
