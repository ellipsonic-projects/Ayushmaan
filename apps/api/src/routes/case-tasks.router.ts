import { Router, Response } from "express";
import { z } from "zod";
import { withTenantContext } from "@ayushman/db/rls-context";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { loadOwnConsultantCase } from "../lib/caseAccess";

// Mounted at /api/tenants/:tenantId/cases/:caseId/tasks.
export const caseTasksRouter: Router = Router({ mergeParams: true });
caseTasksRouter.use(requireTenantMatch);

const createTaskSchema = z
  .object({
    title: z.string().min(1).max(200),
    dueAt: z.string().optional(),
  })
  .strict();

// POST /tenants/:tenantId/cases/:caseId/tasks — CONSULTANT (own case).
// Created tasks are always assigned to the consultant themself — there's no
// assignee picker in the UI that calls this yet.
caseTasksRouter.post(
  "/",
  requireRole("CONSULTANT"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = createTaskSchema.parse(req.body);

    const created = await withTenantContext(req.tenantContext!, async (tx) => {
      const caseRow = await loadOwnConsultantCase(
        tx,
        req.params.tenantId,
        req.params.caseId,
        req.user!.id
      );

      return tx.task.create({
        data: {
          tenantId: req.params.tenantId,
          caseId: caseRow.id,
          title: body.title,
          dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
          assignedTo: "CONSULTANT",
        },
      });
    });

    res.status(201).json({ data: created });
  }
);
