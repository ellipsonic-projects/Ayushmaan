"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasksRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const caseAccess_1 = require("../lib/caseAccess");
const callerProfile_1 = require("../lib/callerProfile");
const workflow_context_1 = require("../lib/workflow-context");
const workflow_events_1 = require("../lib/workflow-events");
// Mounted at /api/tenants/:tenantId/tasks.
exports.tasksRouter = (0, express_1.Router)({ mergeParams: true });
exports.tasksRouter.use(require_tenant_match_1.requireTenantMatch);
async function loadTask(tx, tenantId, taskId) {
    const task = await tx.task.findUnique({ where: { id: taskId } });
    if (!task || task.tenantId !== tenantId) {
        throw new errorHandler_1.AppError(404, "Task not found", "TASK_NOT_FOUND");
    }
    return task;
}
const patchTaskSchema = zod_1.z
    .object({
    title: zod_1.z.string().min(1).max(200).optional(),
    dueAt: zod_1.z.string().optional(),
    status: zod_1.z.enum(["OPEN", "COMPLETED", "OVERDUE"]).optional(),
    // The client's typed answer — required to complete a WRITE_RESPONSE task.
    responseText: zod_1.z.string().min(1).optional(),
})
    .strict();
// PATCH /tenants/:tenantId/tasks/:taskId — CONSULTANT (own case, any field),
// self (CLIENT — may only set status: COMPLETED on a task assigned to them,
// and only for a WRITE_RESPONSE task with responseText attached; UPLOAD_DOCUMENT
// and FILL_FORM tasks instead auto-complete via case-documents.router.ts /
// form-submissions.router.ts once the actual deliverable is provided).
exports.tasksRouter.patch("/:taskId", (0, require_role_1.requireRole)("CONSULTANT", "CLIENT"), async (req, res) => {
    const body = patchTaskSchema.parse(req.body);
    const updated = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const task = await loadTask(tx, req.params.tenantId, req.params.taskId);
        if (req.user.role === "CLIENT") {
            if (task.assignedTo !== "CLIENT") {
                throw new errorHandler_1.AppError(403, "Forbidden", "TASK_UPDATE_FORBIDDEN");
            }
            if (task.type === "UPLOAD_DOCUMENT" || task.type === "FILL_FORM") {
                throw new errorHandler_1.AppError(403, task.type === "UPLOAD_DOCUMENT"
                    ? "Complete this task by uploading the requested document."
                    : "Complete this task by submitting the linked form.", "TASK_UPDATE_FORBIDDEN");
            }
            const allowedKeys = task.type === "WRITE_RESPONSE" ? ["status", "responseText"] : ["status"];
            const onlyCompleting = body.status === "COMPLETED" && Object.keys(body).every((k) => allowedKeys.includes(k));
            if (!onlyCompleting) {
                throw new errorHandler_1.AppError(403, "Forbidden", "TASK_UPDATE_FORBIDDEN");
            }
            if (task.type === "WRITE_RESPONSE" && !body.responseText) {
                throw new errorHandler_1.AppError(422, "responseText is required to complete this task.", "RESPONSE_TEXT_REQUIRED");
            }
            const clientId = await (0, callerProfile_1.getOwnClientProfileId)(tx, req.user.id);
            const caseRow = await tx.case.findUnique({ where: { id: task.caseId } });
            if (!caseRow || clientId !== caseRow.clientId) {
                throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_CASE");
            }
        }
        else {
            await (0, caseAccess_1.loadOwnConsultantCase)(tx, req.params.tenantId, task.caseId, req.user.id);
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
            await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "TASK_COMPLETED", {
                ...(await (0, workflow_context_1.buildCaseContext)(tx, task.caseId)),
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
});
// DELETE /tenants/:tenantId/tasks/:taskId — CONSULTANT (own case).
exports.tasksRouter.delete("/:taskId", (0, require_role_1.requireRole)("CONSULTANT"), async (req, res) => {
    await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const task = await loadTask(tx, req.params.tenantId, req.params.taskId);
        await (0, caseAccess_1.loadOwnConsultantCase)(tx, req.params.tenantId, task.caseId, req.user.id);
        await tx.task.delete({ where: { id: task.id } });
    });
    res.status(204).send();
});
//# sourceMappingURL=tasks.router.js.map