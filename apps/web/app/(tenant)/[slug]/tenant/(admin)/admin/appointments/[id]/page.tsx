import { notFound } from "next/navigation";

import { getTenantAppointment } from "@/lib/api/appointments.server";
import { AppointmentDetailView } from "@/components/tenant/admin/appointments/appointment-detail-view";

export default async function AdminAppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const appointment = await getTenantAppointment(id);
  if (!appointment) notFound();

  return <AppointmentDetailView appointment={appointment} />;
}
