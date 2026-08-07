import { ack, archive, dequeue, WORKFLOW_ADVANCE_QUEUE } from "./pgmq";
import { advanceRun, markRunFailed } from "../services/workflow-engine.service";

// Small polling worker (Sprint 5.5.4 item 3), started alongside the Express
// server in index.ts. Calls dequeue() on an interval and invokes
// workflow-engine.service.ts's advanceRun() for each message.
const POLL_INTERVAL_MS = 5_000;
// Message is hidden from other readers for this long after a dequeue — long
// enough for a normal advanceRun() to finish before the message becomes
// visible (and re-dequeued) again on failure.
const VISIBILITY_TIMEOUT_SECONDS = 30;
const BATCH_SIZE = 10;
// After this many delivery attempts, stop retrying and archive the message —
// mirrors pgmq's own read_ct, which counts every dequeue whether or not it
// was acked.
const MAX_ATTEMPTS = 5;

interface AdvanceMessage {
  runId: string;
}

async function processBatch(): Promise<void> {
  const messages = await dequeue<AdvanceMessage>(
    WORKFLOW_ADVANCE_QUEUE,
    VISIBILITY_TIMEOUT_SECONDS,
    BATCH_SIZE
  );

  for (const message of messages) {
    try {
      await advanceRun(message.message.runId);
      await ack(WORKFLOW_ADVANCE_QUEUE, message.msgId);
    } catch (err) {
      console.error(
        `[workflow-handler] run ${message.message.runId} failed (attempt ${message.readCount})`,
        err
      );
      if (message.readCount >= MAX_ATTEMPTS) {
        await markRunFailed(
          message.message.runId,
          err instanceof Error ? err.message : "Unknown error"
        );
        await archive(WORKFLOW_ADVANCE_QUEUE, message.msgId);
      }
      // Otherwise leave it unacked — pgmq makes it visible again after the
      // visibility timeout, which is the redelivery/retry mechanism.
    }
  }
}

export function startWorkflowWorker(): void {
  setInterval(() => {
    processBatch().catch((err) => console.error("[workflow-handler] poll failed", err));
  }, POLL_INTERVAL_MS);
}
