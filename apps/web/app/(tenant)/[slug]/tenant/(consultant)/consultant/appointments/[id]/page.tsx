import { notFound } from "next/navigation";

import { getTenantAppointment } from "@/lib/api/appointments.server";
import { getTenantConsultants } from "@/lib/api/consultants.server";
import { ConsultantAppointmentDetailView } from "@/components/tenant/consultant/appointments/consultant-appointment-detail-view";

export default async function ConsultantAppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [appointment, consultants] = await Promise.all([
    getTenantAppointment(id),
    getTenantConsultants(),
  ]);
  if (!appointment) notFound();

  return (
    <ConsultantAppointmentDetailView
      appointment={appointment}
      consultants={consultants.map((c) => ({ id: c.id, fullName: c.fullName }))}
    />
  );
}
