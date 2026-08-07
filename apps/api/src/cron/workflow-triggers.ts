import cron from "node-cron";
import type { Prisma } from "@ayushman/db";
import { withTenantContext } from "@ayushman/db/rls-context";
import type { WorkflowGraph } from "@ayushman/types/workflow";
import { enqueue, WORKFLOW_ADVANCE_QUEUE } from "../queue/pgmq";
import { buildConsultantContext } from "../lib/workflow-context";

// Same system-caller convention as cron/task-reminders.ts.
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

function matchesCronField(field: string, value: number): boolean {
  if (field === "*") return true;
  return field.split(",").some((part) => {
    const stepMatch = part.match(/^(\*|\d+-\d+)\/(\d+)$/);
    if (stepMatch) {
      const [, range, stepStr] = stepMatch;
      const step = Number(stepStr);
      if (range === "*") return value % step === 0;
      const [start, end] = range.split("-").map(Number);
      return value >= start && value <= end && (value - start) % step === 0;
    }
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      return value >= start && value <= end;
    }
    return Number(part) === value;
  });
}

// Minimal 5-field cron matcher (minute hour day-of-month month day-of-week)
// — supports `*`, lists, ranges, and `*/n` steps, the subset a SCHEDULE
// trigger's `cron` field (workflow-node-configs.ts) is expected to use.
// Hand-rolled rather than depending on a cron-parsing package for this one
// "does this expression match right now" check, evaluated once a minute by
// startWorkflowTriggersCron below.
export function cronMatchesNow(expression: string, now: Date): boolean {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return false;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
  return (
    matchesCronField(minute, now.getMinutes()) &&
    matchesCronField(hour, now.getHours()) &&
    matchesCronField(dayOfMonth, now.getDate()) &&
    matchesCronField(month, now.getMonth() + 1) &&
    matchesCronField(dayOfWeek, now.getDay())
  );
}

// tenantId is the running consultant's own tenant, not necessarily the
// workflow's (a COMMUNITY workflow's tenantId is null, or some other
// tenant's, when a different tenant's consultant runs it) — every run must
// carry a real tenantId for its own tenant_isolation RLS.
async function createScheduledRun(
  tx: Prisma.TransactionClient,
  workflow: { id: string },
  tenantId: string,
  context: Record<string, unknown>
): Promise<void> {
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

// Sprint 5.5.4 item 5, first half — sweeps every PUBLISHED SCHEDULE workflow
// and starts a fresh run for any whose trigger's cron expression matches the
// current minute.
//
// TENANT/COMMUNITY scoped workflows fan out into one run per consultant in
// the tenant, each carrying that consultant's own context — the same
// per-consultant scoping enqueueEventTriggers (workflow-events.ts) applies
// to EVENT triggers — skipping anyone who's opted this workflow out
// (workflows.router.ts's opt-out endpoints). A PERSONAL workflow only ever
// "belongs" to its single creator, so it stays a single run scoped to them
// (opting out isn't offered there — there's no one else it runs for).
export async function sweepScheduledWorkflows(): Promise<number> {
  const now = new Date();
  return withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: SYSTEM_USER_ID },
    async (tx) => {
      const workflows = await tx.workflow.findMany({
        where: { status: "PUBLISHED", triggerType: "SCHEDULE", deletedAt: null },
      });

      let enqueued = 0;
      for (const workflow of workflows) {
        const graph = workflow.graph as unknown as WorkflowGraph;
        const cronExpr = graph.nodes.find((n) => n.type === "TRIGGER")?.data.config.cron;
        if (typeof cronExpr !== "string" || !cronMatchesNow(cronExpr, now)) continue;

        if (workflow.scope === "PERSONAL") {
          if (!workflow.consultantId) continue;
          const consultant = await tx.consultantProfile.findUnique({
            where: { id: workflow.consultantId },
            select: { tenantId: true },
          });
          if (!consultant) continue;
          await createScheduledRun(
            tx,
            workflow,
            consultant.tenantId,
            await buildConsultantContext(tx, workflow.consultantId)
          );
          enqueued += 1;
          continue;
        }

        // A COMMUNITY workflow fans out to every consultant on the
        // platform, any tenant — not just workflow.tenantId's (which is
        // null for a Super Admin-authored one anyway); TENANT stays scoped
        // to its one owning tenant.
        const [optOuts, consultants] = await Promise.all([
          tx.workflowOptOut.findMany({
            where: { workflowId: workflow.id },
            select: { consultantId: true },
          }),
          tx.consultantProfile.findMany({
            where: workflow.scope === "COMMUNITY" ? {} : { tenantId: workflow.tenantId! },
            select: { id: true, tenantId: true },
          }),
        ]);
        const optedOutIds = new Set(optOuts.map((o) => o.consultantId));

        for (const consultant of consultants) {
          if (optedOutIds.has(consultant.id)) continue;
          await createScheduledRun(
            tx,
            workflow,
            consultant.tenantId,
            await buildConsultantContext(tx, consultant.id)
          );
          enqueued += 1;
        }
      }
      return enqueued;
    }
  );
}

// Sprint 5.5.4 item 5, second half — a WAIT node parks a run rather than
// blocking the worker; this is what wakes it back up once real time catches
// up to resume_at.
export async function sweepWaitingRuns(): Promise<number> {
  return withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: SYSTEM_USER_ID },
    async (tx) => {
      const due = await tx.workflowRun.findMany({
        where: { status: "WAITING", resumeAt: { lte: new Date() }, deletedAt: null },
        select: { id: true },
      });

      for (const run of due) {
        await tx.workflowRun.update({ where: { id: run.id }, data: { status: "RUNNING" } });
        await enqueue(WORKFLOW_ADVANCE_QUEUE, { runId: run.id });
      }
      return due.length;
    }
  );
}

export function startWorkflowTriggersCron(): void {
  // Every minute — matches cron's own minute-level granularity.
  cron.schedule("* * * * *", async () => {
    try {
      await sweepScheduledWorkflows();
      await sweepWaitingRuns();
    } catch (err) {
      console.error("[workflow-triggers] sweep failed", err);
    }
  });
}
