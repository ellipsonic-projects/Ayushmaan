import cron from "node-cron";
import { withTenantContext } from "@ayushman/db/rls-context";
import { dispatch } from "../services/notification.service";

// Sprint 4.4 item 2 — an OPEN task past its due_at flips to OVERDUE so it
// surfaces on the consultant's overdue dashboard / client's "my tasks"
// widget (schema idx_tasks_due_open). Runs cross-tenant under an
// is_super_admin context since no single tenant scope applies here.
// Sprint 5.1 item 5 — fires TASK_DUE to both the client and consultant on
// the task's case, not just the assignee, per the requested notification list.
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function sweepOverdueTasks(): Promise<number> {
  return withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: SYSTEM_USER_ID },
    async (tx) => {
      const overdue = await tx.task.findMany({
        where: { status: "OPEN", dueAt: { lte: new Date() } },
        include: { case: { include: { client: true, consultant: true } } },
      });
      if (overdue.length === 0) return 0;

      for (const task of overdue) {
        const message = {
          subject: "Task overdue",
          body: `Task "${task.title}" is now overdue (was due ${task.dueAt!.toLocaleString()}).`,
        };
        const recipientUserIds = [task.case.client.userId, task.case.consultant?.userId].filter(
          (id): id is string => Boolean(id)
        );

        for (const userId of recipientUserIds) {
          await dispatch(tx, {
            tenantId: task.tenantId,
            userId,
            type: "TASK_DUE",
            message,
            payload: { taskId: task.id, caseId: task.caseId },
          });
        }
      }

      const { count } = await tx.task.updateMany({
        where: { id: { in: overdue.map((t) => t.id) } },
        data: { status: "OVERDUE" },
      });
      return count;
    }
  );
}

export function startTasksOverdueCron() {
  // Every 15 minutes, matching expire-requests.ts's cadence.
  cron.schedule("*/15 * * * *", () => {
    sweepOverdueTasks().catch((err) => {
      console.error("[cron] tasks-overdue failed:", err);
    });
  });
}
