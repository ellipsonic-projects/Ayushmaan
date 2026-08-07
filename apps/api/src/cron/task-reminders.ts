import cron from "node-cron";
import { withTenantContext } from "@ayushman/db/rls-context";
import { dispatch } from "../services/notification.service";

// Sprint 4.4 item 2 — fires a task_reminders row once its lead time before
// the task's due_at has elapsed. Dispatch wired to notification.service.ts's
// dispatch() as of Sprint 5.1 (TASK_REMINDER type); sent_at is still stamped
// so the same reminder never re-fires on retry.
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function sweepTaskReminders(): Promise<number> {
  return withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: SYSTEM_USER_ID },
    async (tx) => {
      const candidates = await tx.taskReminder.findMany({
        where: { sentAt: null, task: { dueAt: { not: null }, status: "OPEN" } },
        include: {
          task: { include: { case: { include: { client: true } } } },
        },
      });

      const now = Date.now();
      const due = candidates.filter(
        (reminder) => reminder.task.dueAt!.getTime() - reminder.leadTimeMins * 60_000 <= now
      );
      if (due.length === 0) return 0;

      for (const reminder of due) {
        const { task } = reminder;
        // sprints.md §5.1.5 — task reminders go to the client only,
        // regardless of who the task is assigned to (unlike TASK_DUE, which
        // fans out to both sides — see tasks-overdue.ts).
        await dispatch(tx, {
          tenantId: task.tenantId,
          userId: task.case.client.userId,
          type: "TASK_REMINDER",
          message: {
            subject: "Task reminder",
            body: `Reminder: "${task.title}" is due ${task.dueAt!.toLocaleString()}.`,
          },
          payload: { taskId: task.id, caseId: task.caseId, dueAt: task.dueAt!.toISOString() },
        });
      }

      const { count } = await tx.taskReminder.updateMany({
        where: { id: { in: due.map((r) => r.id) } },
        data: { sentAt: new Date() },
      });
      return count;
    }
  );
}

export function startTaskRemindersCron() {
  // Every 5 minutes — reminders are lead-time-sensitive, so check more
  // frequently than the coarser overdue/expiry sweeps.
  cron.schedule("*/5 * * * *", () => {
    sweepTaskReminders().catch((err) => {
      console.error("[cron] task-reminders failed:", err);
    });
  });
}
