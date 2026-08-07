"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.caseTasksRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const require_role_1 = require("../middleware/require-role");
const require_tenant_match_1 = require("../middleware/require-tenant-match");
const errorHandler_1 = require("../middleware/errorHandler");
const caseAccess_1 = require("../lib/caseAccess");
const callerProfile_1 = require("../lib/callerProfile");
const workflow_events_1 = require("../lib/workflow-events");
const workflow_context_1 = require("../lib/workflow-context");
const notification_service_1 = require("../services/notification.service");
const form_submission_service_1 = require("../services/form-submission.service");
// Mounted at /api/tenants/:tenantId/cases/:caseId/tasks.
exports.caseTasksRouter = (0, express_1.Router)({ mergeParams: true });
exports.caseTasksRouter.use(require_tenant_match_1.requireTenantMatch);
// CONSULTANT must own the case; CLIENT must be the case's own client.
async function loadCaseForTasks(tx, req) {
    if (req.user.role === "CONSULTANT") {
        return (0, caseAccess_1.loadOwnConsultantCase)(tx, req.params.tenantId, req.params.caseId, req.user.id);
    }
    const found = await tx.case.findUnique({ where: { id: req.params.caseId } });
    if (!found || found.tenantId !== req.params.tenantId) {
        throw new errorHandler_1.AppError(404, "Case not found", "CASE_NOT_FOUND");
    }
    const clientId = await (0, callerProfile_1.getOwnClientProfileId)(tx, req.user.id);
    if (clientId !== found.clientId) {
        throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_CASE");
    }
    return found;
}
const createTaskSchema = zod_1.z
    .object({
    title: zod_1.z.string().min(1).max(200),
    dueAt: zod_1.z.string().optional(),
    assignedTo: zod_1.z.enum(["CLIENT", "CONSULTANT"]).default("CONSULTANT"),
    // The concrete deliverable required to complete a CLIENT-assigned task —
    // a checkbox alone isn't proof the client actually did anything.
    type: zod_1.z.enum(["UPLOAD_DOCUMENT", "FILL_FORM", "WRITE_RESPONSE"]).optional(),
    // The form to send, required when type = FILL_FORM.
    formTemplateId: zod_1.z.string().uuid().optional(),
    // Which channel to send that form through — only meaningful when
    // type = FILL_FORM.
    formChannel: zod_1.z.literal("EMAIL").default("EMAIL"),
    // Lead times (in minutes before dueAt) to nudge on; task_reminders rows
    // are dispatched by the cron sweep in apps/api/src/cron/task-reminders.ts.
    reminders: zod_1.z.array(zod_1.z.object({ leadTimeMins: zod_1.z.number().int().positive() })).optional(),
    // The session (interaction) this was logged during, if any — lets the
    // consultant-facing timeline nest this task under a specific appointment.
    interactionId: zod_1.z.string().uuid().optional(),
    // Direct appointment scoping, independent of interactionId — lets the
    // consultant log a task against an appointment without first writing a
    // session note.
    appointmentId: zod_1.z.string().uuid().optional(),
})
    .strict()
    .superRefine((data, ctx) => {
    // CLIENT-assigned tasks must have a deadline so the client knows when to
    // act — and so the cron-based reminder can fire at the right lead time.
    if (data.assignedTo === "CLIENT" && !data.dueAt) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["dueAt"],
            message: "A deadline (dueAt) is required when assigning a task to a client.",
        });
    }
    // Tasks scoped to an appointment always need a deadline — including
    // CONSULTANT-assigned ones — so consultant follow-ups from a session
    // don't silently go undated.
    if (data.appointmentId && data.assignedTo === "CONSULTANT" && !data.dueAt) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["dueAt"],
            message: "A deadline (dueAt) is required for tasks created under an appointment.",
        });
    }
    if (data.assignedTo === "CLIENT" && !data.type) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["type"],
            message: "A type (UPLOAD_DOCUMENT, FILL_FORM, or WRITE_RESPONSE) is required when assigning a task to a client.",
        });
    }
    if (data.assignedTo === "CONSULTANT" && data.type) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["type"],
            message: "type only applies to tasks assigned to a client.",
        });
    }
    if (data.type === "FILL_FORM" && !data.formTemplateId) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["formTemplateId"],
            message: "formTemplateId is required when type is FILL_FORM.",
        });
    }
    if (data.type !== "FILL_FORM" && data.formTemplateId) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            path: ["formTemplateId"],
            message: "formTemplateId only applies when type is FILL_FORM.",
        });
    }
});
// POST /tenants/:tenantId/cases/:caseId/tasks — CONSULTANT (own case).
exports.caseTasksRouter.post("/", (0, require_role_1.requireRole)("CONSULTANT"), async (req, res) => {
    const body = createTaskSchema.parse(req.body);
    const created = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await (0, caseAccess_1.loadOwnConsultantCase)(tx, req.params.tenantId, req.params.caseId, req.user.id);
        if (body.interactionId) {
            const interaction = await tx.interaction.findUnique({
                where: { id: body.interactionId },
            });
            if (!interaction || interaction.caseId !== caseRow.id) {
                throw new errorHandler_1.AppError(404, "Interaction not found", "INTERACTION_NOT_FOUND");
            }
        }
        if (body.appointmentId) {
            const appointment = await tx.appointment.findUnique({
                where: { id: body.appointmentId },
            });
            if (!appointment || appointment.caseId !== caseRow.id) {
                throw new errorHandler_1.AppError(404, "Appointment not found", "APPOINTMENT_NOT_FOUND");
            }
        }
        if (body.formTemplateId) {
            const template = await tx.formTemplate.findUnique({ where: { id: body.formTemplateId } });
            if (!template || template.deletedAt) {
                throw new errorHandler_1.AppError(404, "Form template not found", "FORM_TEMPLATE_NOT_FOUND");
            }
        }
        const task = await tx.task.create({
            data: {
                tenantId: req.params.tenantId,
                caseId: caseRow.id,
                title: body.title,
                dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
                assignedTo: body.assignedTo,
                type: body.type,
                formTemplateId: body.formTemplateId,
                interactionId: body.interactionId,
                appointmentId: body.appointmentId,
                reminders: body.reminders?.length
                    ? { create: body.reminders.map((r) => ({ leadTimeMins: r.leadTimeMins })) }
                    : undefined,
            },
            include: { reminders: true, case: { include: { client: { include: { user: true } } } } },
        });
        await (0, workflow_events_1.enqueueEventTriggers)(tx, req.params.tenantId, "TASK_CREATED", {
            ...(await (0, workflow_context_1.buildCaseContext)(tx, caseRow.id)),
            task: { id: task.id, title: task.title, assignedTo: task.assignedTo, dueAt: task.dueAt },
        });
        // Send an immediate TASK_REMINDER to the client as soon as the task is
        // created, so they don't have to wait for the next cron sweep (up to 5 min).
        // Only CLIENT-assigned tasks require the client to act, so we skip the
        // notification for CONSULTANT-assigned tasks.
        if (task.assignedTo === "CLIENT") {
            const dueStr = task.dueAt ? ` — due ${task.dueAt.toLocaleString()}` : "";
            await (0, notification_service_1.dispatch)(tx, {
                tenantId: task.tenantId,
                userId: task.case.client.userId,
                type: "TASK_REMINDER",
                message: {
                    subject: "New task assigned to you",
                    body: `Your consultant has assigned you a new task: "${task.title}"${dueStr}.`,
                },
                payload: {
                    taskId: task.id,
                    caseId: task.caseId,
                    dueAt: task.dueAt?.toISOString() ?? null,
                },
            });
        }
        // FILL_FORM tasks require the client to actually submit the linked
        // form to count as done — send it immediately, same channel a
        // SEND_INTAKE_FORM workflow node would use.
        if (task.type === "FILL_FORM" && task.formTemplateId) {
            await (0, form_submission_service_1.createAndSendFormSubmission)(tx, task.tenantId, task.caseId, task.formTemplateId, body.formChannel, {
                email: task.case.client.user.email,
                phone: task.case.client.user.phone,
                fullName: task.case.client.fullName,
            }, undefined, task.id);
        }
        return task;
    });
    res.status(201).json({ data: created });
});
const listTasksQuerySchema = zod_1.z.object({
    assignedTo: zod_1.z.enum(["CLIENT", "CONSULTANT"]).optional(),
    status: zod_1.z.enum(["OPEN", "COMPLETED", "OVERDUE"]).optional(),
});
// GET /tenants/:tenantId/cases/:caseId/tasks — CONSULTANT (own case), self
// (CLIENT, own assigned only).
exports.caseTasksRouter.get("/", (0, require_role_1.requireRole)("CONSULTANT", "CLIENT"), async (req, res) => {
    const query = listTasksQuerySchema.parse(req.query);
    const tasks = await (0, rls_context_1.withTenantContext)(req.tenantContext, async (tx) => {
        const caseRow = await loadCaseForTasks(tx, req);
        const isClient = req.user.role === "CLIENT";
        return tx.task.findMany({
            where: {
                caseId: caseRow.id,
                assignedTo: isClient ? "CLIENT" : query.assignedTo,
                ...(query.status && { status: query.status }),
            },
            orderBy: { createdAt: "desc" },
        });
    });
    res.json({ data: tasks });
});
//# sourceMappingURL=case-tasks.router.js.map