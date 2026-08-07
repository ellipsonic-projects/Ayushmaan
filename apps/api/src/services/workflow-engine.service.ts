import { withTenantContext } from "@ayushman/db/rls-context";
import type { WorkflowGraph } from "@ayushman/types/workflow";
import { nodeHandlers } from "./workflow-node-handlers";

// Same system-caller convention as cron/task-reminders.ts — the engine acts
// on a workflow_runs row, never on behalf of a real signed-in user.
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

// A cycle in the graph (e.g. a BRANCH looping back on itself) would spin
// forever without this — treated as a permanent graph bug, not a transient
// failure, so it fails the run immediately rather than retrying.
const MAX_STEPS_PER_ADVANCE = 50;

type StepOutcome = "continue" | "halt";

// One node, one transaction (Sprint 5.5.4 item 4, refined for Sprint 5.5.5's
// manual retry): each step commits current_node_id *forward* to the next
// node only after this node's handler has actually succeeded. If the
// handler throws, this whole transaction rolls back, so the run row still
// points at the node that just failed — a later retry (workflow-runs.router.ts,
// or workflow-triggers.ts resuming a WAIT) re-enters at exactly that node
// rather than re-running everything before it and re-sending emails/re-
// creating tasks that already succeeded.
async function executeNextStep(runId: string): Promise<StepOutcome> {
  return withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: SYSTEM_USER_ID },
    async (tx) => {
      const run = await tx.workflowRun.findUnique({
        where: { id: runId },
        include: { workflow: true },
      });
      if (!run || run.deletedAt || run.status !== "RUNNING") return "halt";

      const graph = run.workflow.graph as unknown as WorkflowGraph;
      const context = run.context as Record<string, unknown>;
      const nodeId = run.currentNodeId ?? graph.nodes.find((n) => n.type === "TRIGGER")?.id ?? null;

      if (!nodeId) {
        await tx.workflowRun.update({
          where: { id: run.id },
          data: { status: "COMPLETED", currentNodeId: null, resumeAt: null },
        });
        return "halt";
      }

      const node = graph.nodes.find((n) => n.id === nodeId);
      if (!node) {
        await tx.workflowRun.update({
          where: { id: run.id },
          data: { status: "FAILED", failureReason: `Node ${nodeId} not found in workflow graph` },
        });
        return "halt";
      }

      // A non-null resumeAt means this node is a WAIT that already parked
      // the run once and workflow-triggers.ts's sweepWaitingRuns is now
      // resuming it past its elapsed wait — the handler must be skipped
      // rather than re-run (which would just compute a new wait and re-park
      // forever).
      const resumingPastWait = node.type === "WAIT" && run.resumeAt !== null;
      const result = resumingPastWait
        ? {}
        : await nodeHandlers[node.type](tx, run.tenantId, run.id, node, context);

      if (result.resumeAt) {
        await tx.workflowRun.update({
          where: { id: run.id },
          data: { status: "WAITING", currentNodeId: node.id, resumeAt: result.resumeAt },
        });
        return "halt";
      }

      const nextEdge = graph.edges.find((edge) => {
        if (edge.source !== node.id) return false;
        return result.sourceHandle === undefined ? true : edge.sourceHandle === result.sourceHandle;
      });
      const nextNodeId = nextEdge?.target ?? null;

      // SEND_INTAKE_FORM already sent the form and wants to park — advance
      // currentNodeId to whatever comes *after* it now (same lookup a normal
      // step does) so resuming later is just flipping status back to RUNNING
      // and re-enqueueing (form-submissions.router.ts), no special-cased
      // re-entry logic needed the way WAIT requires above.
      if (result.waitingOnForm) {
        await tx.workflowRun.update({
          where: { id: run.id },
          data: { status: "WAITING_ON_FORM", currentNodeId: nextNodeId, resumeAt: null },
        });
        return "halt";
      }

      if (!nextNodeId) {
        await tx.workflowRun.update({
          where: { id: run.id },
          data: { status: "COMPLETED", currentNodeId: null, resumeAt: null },
        });
        return "halt";
      }

      await tx.workflowRun.update({
        where: { id: run.id },
        data: { currentNodeId: nextNodeId, resumeAt: null },
      });
      return "continue";
    }
  );
}

// Called once per pgmq message by queue/workflow.handler.ts. Walks the graph
// one committed step at a time until a WAIT node parks the run, a dead end
// completes it, the graph proves broken, or a handler throws — in which
// case the error propagates to the caller so the message stays unacked for
// visibility-timeout redelivery (Sprint 5.5.4 item 4's failure handling).
export async function advanceRun(runId: string): Promise<void> {
  for (let step = 0; step < MAX_STEPS_PER_ADVANCE; step += 1) {
    const outcome = await executeNextStep(runId);
    if (outcome === "halt") return;
  }
  await markRunFailed(runId, "Exceeded max step count — check the graph for a cycle");
}

// Called by queue/workflow.handler.ts once a run's retry attempts are
// exhausted, and by workflow-runs.router.ts's manual retry endpoint isn't
// needed here — that one just flips status back to RUNNING and re-enqueues,
// since currentNodeId already points at the right resume node.
export async function markRunFailed(runId: string, reason: string): Promise<void> {
  await withTenantContext({ tenantId: null, isSuperAdmin: true, userId: SYSTEM_USER_ID }, (tx) =>
    tx.workflowRun.update({
      where: { id: runId },
      data: { status: "FAILED", failureReason: reason },
    })
  );
}
