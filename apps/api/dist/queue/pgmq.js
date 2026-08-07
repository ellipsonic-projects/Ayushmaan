"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKFLOW_ADVANCE_QUEUE = void 0;
exports.enqueue = enqueue;
exports.dequeue = dequeue;
exports.ack = ack;
exports.archive = archive;
const db_1 = require("@ayushman/db");
// Thin wrappers around pgmq's SQL functions (Sprint 5.5.4 item 2), called
// through the existing Prisma client singleton — no separate connection
// config, no Redis. Queue operations aren't tenant-scoped/RLS-governed (the
// queue only ever carries a workflow_runs.id, and every node handler that
// touches tenant data opens its own withTenantContext transaction), so this
// uses the raw `prisma` client rather than a tenant-scoped transaction.
exports.WORKFLOW_ADVANCE_QUEUE = "workflow-advance";
async function enqueue(queueName, message, delaySeconds = 0) {
    const rows = await db_1.prisma.$queryRaw `
    SELECT pgmq.send(${queueName}::text, ${JSON.stringify(message)}::jsonb, ${delaySeconds}::integer) AS send
  `;
    return rows[0].send;
}
// visibilityTimeoutSeconds: how long a dequeued message is hidden from other
// readers before it's considered abandoned and becomes visible again — the
// mechanism that gives a crashed/hung handler automatic redelivery rather
// than a lost message (Sprint 5.5.4 item 4's "failure ... unacked for
// visibility-timeout-based redelivery").
async function dequeue(queueName, visibilityTimeoutSeconds, quantity) {
    const rows = await db_1.prisma.$queryRaw `
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
async function ack(queueName, msgId) {
    await db_1.prisma.$queryRaw `SELECT pgmq.delete(${queueName}::text, ${msgId}::bigint)`;
}
// Moves a message to the queue's archive table instead of deleting it —
// keeps a record of workflow runs that exhausted their retry attempts,
// mirroring the platform's no-hard-delete convention elsewhere.
async function archive(queueName, msgId) {
    await db_1.prisma.$queryRaw `SELECT pgmq.archive(${queueName}::text, ${msgId}::bigint)`;
}
//# sourceMappingURL=pgmq.js.map