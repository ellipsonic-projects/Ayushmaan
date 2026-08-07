import { ConsultantApplicationsTable } from "@/components/tenant/admin/consultant-applications/consultant-applications-table";
import { InviteCodeCard } from "@/components/tenant/admin/consultant-applications/invite-code-card";
import { getTenantConsultantApplications } from "@/lib/api/consultant-applications.server";

export default async function ConsultantApplicationsPage() {
  const applications = await getTenantConsultantApplications();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Consultant Applications</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review requests from clients who want to practice as consultants under your organization.
        </p>
      </div>
      <InviteCodeCard />
      <ConsultantApplicationsTable initialApplications={applications} />
    </div>
  );
}
