import { BookAppointmentFlow } from "@/components/tenant/client/appointments/book-appointment-flow";
import { getOwnClientProfile } from "@/lib/api/clients.server";

export default async function BookAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const [client, params] = await Promise.all([getOwnClientProfile(), searchParams]);

  return <BookAppointmentFlow client={client} initialCategory={params.category} />;
}
