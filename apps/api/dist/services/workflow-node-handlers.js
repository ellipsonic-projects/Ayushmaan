"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodeHandlers = void 0;
const template_render_service_1 = require("./template-render.service");
const template_header_1 = require("../lib/template-header");
const workflow_actions_1 = require("./workflow-actions");
const form_submission_service_1 = require("./form-submission.service");
const workflow_merge_fields_1 = require("../lib/workflow-merge-fields");
const smtp_1 = require("../integrations/smtp");
const email_layout_1 = require("../lib/email-layout");
function getNodeConfig(node) {
    return node.data.config;
}
async function sendViaTemplate(tx, tenantId, channel, templateId, context, recipient = "CLIENT") {
    const template = await tx.workflowTemplate.findUnique({ where: { id: templateId } });
    if (!template || template.deletedAt) {
        console.warn(`[workflow-engine] template ${templateId} not found — skipping ${channel} send`);
        return;
    }
    const contact = recipient === "CONSULTANT"
        ? context.consultant
        : context.client;
    const caseId = context.case?.id;
    const header = (0, template_header_1.buildTemplateHeader)(context);
    if (!contact?.email)
        return;
    const html = (0, email_layout_1.wrapEmailHtml)((0, template_header_1.renderTemplateHeaderHtml)(header) + (0, template_render_service_1.renderTemplate)(template.content, context, "EMAIL"));
    await (0, smtp_1.sendEmail)(contact.email, template.subject ?? "", html);
    await recordSharedTemplate(tx, tenantId, caseId, template, context, channel);
}
// Surfaces every workflow-sent message template on the client/consultant
// documentation pages (apps/web's shared-templates fetchers), same
// visibility a manually-shared template gets via shared-templates.router.ts.
// A missing case.id means this run has no case to attach the record to
// (e.g. a tenant-level trigger) — skipped rather than failing the send,
// which already succeeded.
async function recordSharedTemplate(tx, tenantId, caseId, template, context, channel) {
    if (!caseId)
        return;
    const header = (0, template_header_1.buildTemplateHeader)(context);
    await tx.sharedTemplate.create({
        data: {
            tenantId,
            caseId,
            workflowTemplateId: template.id,
            templateName: template.name,
            channel,
            renderedContent: {
                subject: template.subject,
                html: (0, template_header_1.renderTemplateHeaderHtml)(header) + (0, template_render_service_1.renderTemplate)(template.content, context, "EMAIL"),
                text: (0, template_header_1.renderTemplateHeaderText)(header) + (0, template_render_service_1.renderTemplate)(template.content, context, channel),
            },
        },
    });
}
exports.nodeHandlers = {
    // Just the entry point — advancing past it is the engine walking to its
    // one outgoing edge.
    TRIGGER: async () => ({}),
    SEND_EMAIL: async (tx, tenantId, _runId, node, context) => {
        const config = getNodeConfig(node);
        await sendViaTemplate(tx, tenantId, "EMAIL", config.templateId, context, config.recipient);
        return {};
    },
    CREATE_TASK: async (tx, tenantId, _runId, node, context) => {
        const config = getNodeConfig(node);
        const caseId = context.case?.id;
        if (!caseId) {
            console.warn("[workflow-engine] CREATE_TASK: no case.id in context — skipping");
            return {};
        }
        await tx.task.create({
            data: {
                tenantId,
                caseId,
                title: (0, workflow_merge_fields_1.resolveMergeFields)(config.title, context),
                assignedTo: config.assignedTo,
                dueAt: config.dueInMins ? new Date(Date.now() + config.dueInMins * 60000) : undefined,
            },
        });
        return {};
    },
    CREATE_COMMITMENT: async (tx, tenantId, _runId, node, context) => {
        const config = getNodeConfig(node);
        const caseId = context.case?.id;
        if (!caseId) {
            console.warn("[workflow-engine] CREATE_COMMITMENT: no case.id in context — skipping");
            return {};
        }
        await tx.commitment.create({
            data: {
                tenantId,
                caseId,
                title: (0, workflow_merge_fields_1.resolveMergeFields)(config.title, context),
                dueAt: config.dueInMins ? new Date(Date.now() + config.dueInMins * 60000) : undefined,
            },
        });
        return {};
    },
    // Sends the form link, then parks the run (waitingOnForm: true) rather
    // than continuing — the run only resumes when the client actually submits
    // (form-submissions.router.ts), at which point context.form is populated
    // with their answers so a downstream CONDITION/BRANCH node can branch on
    // them, same as a FORM_SUBMITTED-triggered fresh run gets.
    SEND_INTAKE_FORM: async (tx, tenantId, runId, node, context) => {
        const config = getNodeConfig(node);
        const caseId = context.case?.id;
        if (!caseId) {
            console.warn("[workflow-engine] SEND_INTAKE_FORM: no case.id in context — skipping");
            return {};
        }
        const client = context.client;
        await (0, form_submission_service_1.createAndSendFormSubmission)(tx, tenantId, caseId, config.formTemplateId, config.channel, client ?? {}, runId);
        return { waitingOnForm: true };
    },
    WAIT: async (_tx, _tenantId, _runId, node) => {
        const config = getNodeConfig(node);
        return { resumeAt: new Date(Date.now() + config.durationMins * 60000) };
    },
    CONDITION: async (_tx, _tenantId, _runId, node, context) => {
        const config = getNodeConfig(node);
        const actual = (0, workflow_merge_fields_1.resolvePath)(context, config.field);
        const matched = config.operator === "EXISTS"
            ? actual !== undefined && actual !== null
            : config.operator === "EQUALS"
                ? String(actual) === config.value
                : String(actual) !== config.value;
        return { sourceHandle: matched ? "true" : "false" };
    },
    BRANCH: async (_tx, _tenantId, _runId, node, context) => {
        const config = getNodeConfig(node);
        const index = config.branches.findIndex((branch) => String((0, workflow_merge_fields_1.resolvePath)(context, branch.field)) === branch.value);
        return index === -1 ? {} : { sourceHandle: String(index) };
    },
    CUSTOM_ACTION: async (tx, tenantId, _runId, node, context) => {
        const config = getNodeConfig(node);
        await (0, workflow_actions_1.runCustomAction)(tx, tenantId, config.operation, config.payload, context);
        return {};
    },
};
//# sourceMappingURL=workflow-node-handlers.js.map