import { Router, Response } from "express";
import { z } from "zod";
import type { Prisma, Task } from "@ayushman/db";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";
import { loadOwnConsultantCase } from "../lib/caseAccess";
import { getOwnClientProfileId } from "../lib/callerProfile";
import { buildCaseContext } from "../lib/workflow-context";
import { enqueueEventTriggers } from "../lib/workflow-events";

// Mounted at /api/tenants/:tenantId/tasks.
export const tasksRouter: Router = Router({ mergeParams: true });
tasksRouter.use(requireTenantMatch);

async function loadTask(
  tx: Prisma.TransactionClient,
  tenantId: string,
  taskId: string
): Promise<Task> {
  const task = await tx.task.findUnique({ where: { id: taskId } });
  if (!task || task.tenantId !== tenantId) {
    throw new AppError(404, "Task not found", "TASK_NOT_FOUND");
  }
  return task;
}

const patchTaskSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    dueAt: z.string().optional(),
    status: z.enum(["OPEN", "COMPLETED", "OVERDUE"]).optional(),
    // The client's typed answer — required to complete a WRITE_RESPONSE task.
    responseText: z.string().min(1).optional(),
  })
  .strict();

// PATCH /tenants/:tenantId/tasks/:taskId — CONSULTANT (own case, any field),
// self (CLIENT — may only set status: COMPLETED on a task assigned to them,
// and only for a WRITE_RESPONSE task with responseText attached; UPLOAD_DOCUMENT
// and FILL_FORM tasks instead auto-complete via case-documents.router.ts /
// form-submissions.router.ts once the actual deliverable is provided).
tasksRouter.patch(
  "/:taskId",
  requireRole("CONSULTANT", "CLIENT"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = patchTaskSchema.parse(req.body);

    const updated = await withTenantContext(req.tenantContext!, async (tx) => {
      const task = await loadTask(tx, req.params.tenantId, req.params.taskId);

      if (req.user!.role === "CLIENT") {
        if (task.assignedTo !== "CLIENT") {
          throw new AppError(403, "Forbidden", "TASK_UPDATE_FORBIDDEN");
        }
        if (task.type === "UPLOAD_DOCUMENT" || task.type === "FILL_FORM") {
          throw new AppError(
            403,
            task.type === "UPLOAD_DOCUMENT"
              ? "Complete this task by uploading the requested document."
              : "Complete this task by submitting the linked form.",
            "TASK_UPDATE_FORBIDDEN"
          );
        }
        const allowedKeys =
          task.type === "WRITE_RESPONSE" ? ["status", "responseText"] : ["status"];
        const onlyCompleting =
          body.status === "COMPLETED" && Object.keys(body).every((k) => allowedKeys.includes(k));
        if (!onlyCompleting) {
          throw new AppError(403, "Forbidden", "TASK_UPDATE_FORBIDDEN");
        }
        if (task.type === "WRITE_RESPONSE" && !body.responseText) {
          throw new AppError(
            422,
            "responseText is required to complete this task.",
            "RESPONSE_TEXT_REQUIRED"
          );
        }
        const clientId = await getOwnClientProfileId(tx, req.user!.id);
        const caseRow = await tx.case.findUnique({ where: { id: task.caseId } });
        if (!caseRow || clientId !== caseRow.clientId) {
          throw new AppError(403, "Forbidden", "NOT_OWN_CASE");
        }
      } else {
        await loadOwnConsultantCase(tx, req.params.tenantId, task.caseId, req.user!.id);
      }

      const updatedTask = await tx.task.update({
        where: { id: task.id },
        data: {
          ...body,
          dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
          completedAt: body.status === "COMPLETED" ? new Date() : undefined,
        },
      });

      if (body.status === "COMPLETED" && task.status !== "COMPLETED") {
        await enqueueEventTriggers(tx, req.params.tenantId, "TASK_COMPLETED", {
          ...(await buildCaseContext(tx, task.caseId)),
          task: {
            id: updatedTask.id,
            title: updatedTask.title,
            assignedTo: updatedTask.assignedTo,
          },
        });
      }

      return updatedTask;
    });

    res.json({ data: updated });
  }
);

// DELETE /tenants/:tenantId/tasks/:taskId — CONSULTANT (own case).
tasksRouter.delete(
  "/:taskId",
  requireRole("CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    await withTenantContext(req.tenantContext!, async (tx) => {
      const task = await loadTask(tx, req.params.tenantId, req.params.taskId);
      await loadOwnConsultantCase(tx, req.params.tenantId, task.caseId, req.user!.id);
      await tx.task.delete({ where: { id: task.id } });
    });
    res.status(204).send();
  }
);
