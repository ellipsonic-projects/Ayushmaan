import { InboxWorkspace } from "@/components/tenant/shared/inbox/inbox-workspace";
import { getInboxConnection } from "@/lib/api/inbox.server";

export default async function ConsultantInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ inbox?: "connected" | "error" }>;
}) {
  const { inbox } = await searchParams;
  const connection = await getInboxConnection();

  return <InboxWorkspace initialConnection={connection} connectResult={inbox ?? null} />;
}
