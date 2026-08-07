import { prisma } from "@ayushman/db";

// Thin wrappers around pgmq's SQL functions (Sprint 5.5.4 item 2), called
// through the existing Prisma client singleton — no separate connection
// config, no Redis. Queue operations aren't tenant-scoped/RLS-governed (the
// queue only ever carries a workflow_runs.id, and every node handler that
// touches tenant data opens its own withTenantContext transaction), so this
// uses the raw `prisma` client rather than a tenant-scoped transaction.
export const WORKFLOW_ADVANCE_QUEUE = "workflow-advance";

export interface PgmqMessage<T> {
  msgId: bigint;
  readCount: number;
  enqueuedAt: Date;
  visibleAt: Date;
  message: T;
}

export async function enqueue<T>(queueName: string, message: T, delaySeconds = 0): Promise<bigint> {
  const rows = await prisma.$queryRaw<{ send: bigint }[]>`
    SELECT pgmq.send(${queueName}::text, ${JSON.stringify(message)}::jsonb, ${delaySeconds}::integer) AS send
  `;
  return rows[0].send;
}

// visibilityTimeoutSeconds: how long a dequeued message is hidden from other
// readers before it's considered abandoned and becomes visible again — the
// mechanism that gives a crashed/hung handler automatic redelivery rather
// than a lost message (Sprint 5.5.4 item 4's "failure ... unacked for
// visibility-timeout-based redelivery").
export async function dequeue<T>(
  queueName: string,
  visibilityTimeoutSeconds: number,
  quantity: number
): Promise<PgmqMessage<T>[]> {
  const rows = await prisma.$queryRaw<
    { msg_id: bigint; read_ct: number; enqueued_at: Date; vt: Date; message: T }[]
  >`
    SELECT * FROM pgmq.read(${queueName}, ${visibilityTimeoutSeconds}, ${quantity})
  `;
  return rows.map((row) => ({
    msgId: row.msg_id,
    readCount: row.read_ct,
    enqueuedAt: row.enqueued_at,
    visibleAt: row.vt,
    message: row.message,
  }));
}

export async function ack(queueName: string, msgId: bigint): Promise<void> {
  await prisma.$queryRaw`SELECT pgmq.delete(${queueName}::text, ${msgId}::bigint)`;
}

// Moves a message to the queue's archive table instead of deleting it —
// keeps a record of workflow runs that exhausted their retry attempts,
// mirroring the platform's no-hard-delete convention elsewhere.
export async function archive(queueName: string, msgId: bigint): Promise<void> {
  await prisma.$queryRaw`SELECT pgmq.archive(${queueName}::text, ${msgId}::bigint)`;
}
