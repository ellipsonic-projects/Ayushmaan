import type { Prisma } from "@ayushman/db";
import type { WorkflowGraphNode } from "@ayushman/types/workflow";
import type { NodeConfigFor, WorkflowNodeConfig } from "@ayushman/types/workflow-node-configs";
import { renderTemplate } from "./template-render.service";
import {
  buildTemplateHeader,
  renderTemplateHeaderHtml,
  renderTemplateHeaderText,
} from "../lib/template-header";
import { runCustomAction } from "./workflow-actions";
import { createAndSendFormSubmission } from "./form-submission.service";
import { resolveMergeFields, resolvePath } from "../lib/workflow-merge-fields";
import { sendEmail } from "../integrations/smtp";
import { wrapEmailHtml } from "../lib/email-layout";

function getNodeConfig<T extends WorkflowNodeConfig["nodeType"]>(
  node: WorkflowGraphNode
): NodeConfigFor<T> {
  return node.data.config as NodeConfigFor<T>;
}

// One handler per WorkflowNodeType (workflow.ts), dispatched by
// workflow-engine.service.ts's core loop. A handler either has a side effect
// (SEND_*/CREATE_*/CUSTOM_ACTION), pauses the run (WAIT), or picks which
// outgoing edge to follow next (CONDITION/BRANCH) — never more than one of
// those per node.
export interface NodeHandlerResult {
  // Which outgoing edge to follow, matched against WorkflowGraphEdge.sourceHandle.
  // Undefined for every linear node type — those have exactly one outgoing
  // edge with no handle. Only CONDITION ("true"/"false") and BRANCH (branch
  // index as a string) set this.
  sourceHandle?: string;
  // Set only by WAIT — tells the engine to park the run as WAITING rather
  // than keep walking the graph.
  resumeAt?: Date;
  // Set only by SEND_INTAKE_FORM — tells the engine to park the run as
  // WAITING_ON_FORM (currentNodeId advanced past this node already, same as
  // a normal step) rather than keep walking the graph. Resumes only when
  // form-submissions.router.ts's submit handler re-enqueues this run.
  waitingOnForm?: boolean;
}

type NodeHandler = (
  tx: Prisma.TransactionClient,
  tenantId: string,
  runId: string,
  node: WorkflowGraphNode,
  context: Record<string, unknown>
) => Promise<NodeHandlerResult>;

async function sendViaTemplate(
  tx: Prisma.TransactionClient,
  tenantId: string,
  channel: "EMAIL",
  templateId: string,
  context: Record<string, unknown>,
  recipient: "CLIENT" | "CONSULTANT" = "CLIENT"
): Promise<void> {
  const template = await tx.workflowTemplate.findUnique({ where: { id: templateId } });
  if (!template || template.deletedAt) {
    console.warn(`[workflow-engine] template ${templateId} not found — skipping ${channel} send`);
    return;
  }

  const contact =
    recipient === "CONSULTANT"
      ? (context.consultant as { email?: string | null; phone?: string | null } | undefined)
      : (context.client as { email?: string | null; phone?: string | null } | undefined);
  const caseId = (context.case as { id?: string } | undefined)?.id;
  const header = buildTemplateHeader(context);
  if (!contact?.email) return;
  const html = wrapEmailHtml(
    renderTemplateHeaderHtml(header) + renderTemplate(template.content, context, "EMAIL")
  );
  await sendEmail(contact.email, template.subject ?? "", html);
  await recordSharedTemplate(tx, tenantId, caseId, template, context, channel);
}

// Surfaces every workflow-sent message template on the client/consultant
// documentation pages (apps/web's shared-templates fetchers), same
// visibility a manually-shared template gets via shared-templates.router.ts.
// A missing case.id means this run has no case to attach the record to
// (e.g. a tenant-level trigger) — skipped rather than failing the send,
// which already succeeded.
async function recordSharedTemplate(
  tx: Prisma.TransactionClient,
  tenantId: string,
  caseId: string | undefined,
  template: { id: string; name: string; subject: string | null; content: unknown },
  context: Record<string, unknown>,
  channel: "EMAIL"
): Promise<void> {
  if (!caseId) return;
  const header = buildTemplateHeader(context);
  await tx.sharedTemplate.create({
    data: {
      tenantId,
      caseId,
      workflowTemplateId: template.id,
      templateName: template.name,
      channel,
      renderedContent: {
        subject: template.subject,
        html: renderTemplateHeaderHtml(header) + renderTemplate(template.content, context, "EMAIL"),
        text: renderTemplateHeaderText(header) + renderTemplate(template.content, context, channel),
      },
    },
  });
}

export const nodeHandlers: Record<WorkflowGraphNode["type"], NodeHandler> = {
  // Just the entry point — advancing past it is the engine walking to its
  // one outgoing edge.
  TRIGGER: async () => ({}),

  SEND_EMAIL: async (tx, tenantId, _runId, node, context) => {
    const config = getNodeConfig<"SEND_EMAIL">(node);
    await sendViaTemplate(tx, tenantId, "EMAIL", config.templateId, context, config.recipient);
    return {};
  },

  CREATE_TASK: async (tx, tenantId, _runId, node, context) => {
    const config = getNodeConfig<"CREATE_TASK">(node);
    const caseId = (context.case as { id?: string } | undefined)?.id;
    if (!caseId) {
      console.warn("[workflow-engine] CREATE_TASK: no case.id in context — skipping");
      return {};
    }
    await tx.task.create({
      data: {
        tenantId,
        caseId,
        title: resolveMergeFields(config.title, context),
        assignedTo: config.assignedTo,
        dueAt: config.dueInMins ? new Date(Date.now() + config.dueInMins * 60_000) : undefined,
      },
    });
    return {};
  },

  CREATE_COMMITMENT: async (tx, tenantId, _runId, node, context) => {
    const config = getNodeConfig<"CREATE_COMMITMENT">(node);
    const caseId = (context.case as { id?: string } | undefined)?.id;
    if (!caseId) {
      console.warn("[workflow-engine] CREATE_COMMITMENT: no case.id in context — skipping");
      return {};
    }
    await tx.commitment.create({
      data: {
        tenantId,
        caseId,
        title: resolveMergeFields(config.title, context),
        dueAt: config.dueInMins ? new Date(Date.now() + config.dueInMins * 60_000) : undefined,
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
    const config = getNodeConfig<"SEND_INTAKE_FORM">(node);
    const caseId = (context.case as { id?: string } | undefined)?.id;
    if (!caseId) {
      console.warn("[workflow-engine] SEND_INTAKE_FORM: no case.id in context — skipping");
      return {};
    }
    const client = context.client as
      { email?: string | null; phone?: string | null; fullName?: string | null } | undefined;
    await createAndSendFormSubmission(
      tx,
      tenantId,
      caseId,
      config.formTemplateId,
      config.channel,
      client ?? {},
      runId
    );
    return { waitingOnForm: true };
  },

  WAIT: async (_tx, _tenantId, _runId, node) => {
    const config = getNodeConfig<"WAIT">(node);
    return { resumeAt: new Date(Date.now() + config.durationMins * 60_000) };
  },

  CONDITION: async (_tx, _tenantId, _runId, node, context) => {
    const config = getNodeConfig<"CONDITION">(node);
    const actual = resolvePath(context, config.field);
    const matched =
      config.operator === "EXISTS"
        ? actual !== undefined && actual !== null
        : config.operator === "EQUALS"
          ? String(actual) === config.value
          : String(actual) !== config.value;
    return { sourceHandle: matched ? "true" : "false" };
  },

  BRANCH: async (_tx, _tenantId, _runId, node, context) => {
    const config = getNodeConfig<"BRANCH">(node);
    const index = config.branches.findIndex(
      (branch) => String(resolvePath(context, branch.field)) === branch.value
    );
    return index === -1 ? {} : { sourceHandle: String(index) };
  },

  CUSTOM_ACTION: async (tx, tenantId, _runId, node, context) => {
    const config = getNodeConfig<"CUSTOM_ACTION">(node);
    await runCustomAction(tx, tenantId, config.operation, config.payload, context);
    return {};
  },
};
