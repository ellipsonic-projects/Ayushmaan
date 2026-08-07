import type { Prisma } from "@ayushman/db";
import type { WorkflowGraph } from "@ayushman/types/workflow";
import { enqueue, WORKFLOW_ADVANCE_QUEUE } from "../queue/pgmq";

// The generic hook every EVENT-triggered write path calls (Sprint 5.5.4 item
// 6) — e.g. appointments.router.ts on a new booking, case-documents.router.ts
// on upload, tasks.router.ts on completion. Adding a new trigger point is
// just one more call site; no new plumbing needed per event.
//
// Runs inside the caller's own already-open tenant transaction (the same one
// that just wrote the appointment/document/task row) rather than opening a
// new one — the workflow lookup is read-only, matching either this tenant's
// own PERSONAL/TENANT workflows or any COMMUNITY one regardless of its
// (possibly null) tenantId, and starting the run atomically alongside the
// triggering write means a workflow never fires for a write that then rolls
// back.
//
// `matchFormTemplateId` — when provided (FORM_SUBMITTED triggers only) the
// trigger node must also carry a matching formTemplateId in its config so two
// workflows watching *different* forms don't both fire on every submission.
export async function enqueueEventTriggers(
  tx: Prisma.TransactionClient,
  tenantId: string,
  eventName: string,
  context: Record<string, unknown>,
  matchFormTemplateId?: string
): Promise<void> {
  const candidates = await tx.workflow.findMany({
    where: {
      OR: [{ tenantId }, { scope: "COMMUNITY" }],
      status: "PUBLISHED",
      triggerType: "EVENT",
      deletedAt: null,
    },
    select: { id: true, graph: true },
  });

  // The case's owning consultant, if this event carries one (buildCaseContext
  // puts it at context.consultant.id) — used below to skip a workflow this
  // specific consultant has opted out of (workflows.router.ts's opt-out
  // endpoints) without affecting whether it fires for anyone else's cases.
  const consultantId = (context.consultant as { id?: string } | null | undefined)?.id;

  for (const workflow of candidates) {
    const graph = workflow.graph as unknown as WorkflowGraph;
    const triggerNode = graph.nodes?.find((node) => node.type === "TRIGGER");
    if (triggerNode?.data.config.eventName !== eventName) continue;

    // For FORM_SUBMITTED: the trigger node must pin to a specific form template.
    // Any workflow whose trigger has no formTemplateId (mis-configured) is skipped
    // rather than firing for every form submission globally.
    if (matchFormTemplateId !== undefined) {
      if (triggerNode?.data.config.formTemplateId !== matchFormTemplateId) continue;
    }

    if (consultantId) {
      const optedOut = await tx.workflowOptOut.findUnique({
        where: { workflowId_consultantId: { workflowId: workflow.id, consultantId } },
      });
      if (optedOut) continue;
    }

    const run = await tx.workflowRun.create({
      data: {
        tenantId,
        workflowId: workflow.id,
        status: "RUNNING",
        context: context as Prisma.InputJsonValue,
      },
    });

    await enqueue(WORKFLOW_ADVANCE_QUEUE, { runId: run.id });
  }
}
