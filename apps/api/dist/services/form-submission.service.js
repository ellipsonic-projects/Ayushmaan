"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAndSendFormSubmission = createAndSendFormSubmission;
const crypto_1 = require("crypto");
const smtp_1 = require("../integrations/smtp");
const email_layout_1 = require("../lib/email-layout");
const SUBMISSION_TTL_DAYS = 14;
// Shared by workflow-node-handlers.ts's SEND_INTAKE_FORM handler (and any
// future manual "resend" affordance) — generates the public fill link
// (form-submissions.router.ts's publicFormSubmissionsRouter) and dispatches
// it through the same integration layer every other SEND_* node uses.
async function createAndSendFormSubmission(tx, tenantId, caseId, formTemplateId, channel, client, 
// Set when this send comes from a SEND_INTAKE_FORM workflow node (never for
// a manual "resend" affordance) — recorded so the submit handler
// (form-submissions.router.ts) knows which WAITING_ON_FORM run to resume.
workflowRunId, 
// Set when this send fulfills a Task of type FILL_FORM — lets the submit
// handler complete that task the same way it resumes a workflow run.
taskId) {
    const template = await tx.formTemplate.findUnique({ where: { id: formTemplateId } });
    if (!template || template.deletedAt) {
        console.warn(`[form-submission] template ${formTemplateId} not found — skipping ${channel} send`);
        return;
    }
    const accessToken = (0, crypto_1.randomBytes)(24).toString("hex");
    await tx.formSubmission.create({
        data: {
            tenantId,
            caseId,
            formTemplateId,
            workflowRunId,
            taskId,
            channel,
            accessToken,
            expiresAt: new Date(Date.now() + SUBMISSION_TTL_DAYS * 24 * 60 * 60 * 1000),
        },
    });
    const link = `${process.env.NEXT_PUBLIC_TENANT_ROOT_HOST ?? ""}/forms/${accessToken}`;
    const greeting = client.fullName ? `Hi ${client.fullName},` : "Hi,";
    const message = `${greeting} please fill out "${template.name}" here: ${link}`;
    if (!client.email)
        return;
    await (0, smtp_1.sendEmail)(client.email, `Please fill out: ${template.name}`, (0, email_layout_1.wrapEmailHtml)((0, email_layout_1.textToHtml)(message)));
}
//# sourceMappingURL=form-submission.service.js.map