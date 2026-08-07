import { getOwnClientProfile } from "@/lib/api/clients.server";
import { getClientCaseTasks, type ClientCaseTask } from "@/lib/api/client-tasks.server";
import ClientTasksView, { type ClientCaseOption } from "./tasks-client";

export default async function ClientTasksPage() {
  const client = await getOwnClientProfile();
  const clientCases = client?.cases ?? [];

  const cases: ClientCaseOption[] = clientCases
    .filter((c) => c.consultant)
    .map((c) => ({
      id: c.id,
      tenantId: c.tenantId,
      tenantSlug: c.tenant.slug,
      consultantName: c.consultant!.fullName,
    }));

  const tasksByCase: Record<string, ClientCaseTask[]> = {};
  await Promise.all(
    cases.map(async (c) => {
      tasksByCase[c.id] = await getClientCaseTasks(c.tenantId, c.tenantSlug, c.id);
    })
  );

  return <ClientTasksView cases={cases} initialTasks={tasksByCase} />;
}
