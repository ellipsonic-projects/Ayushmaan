export declare const WORKFLOW_ADVANCE_QUEUE = "workflow-advance";
export interface PgmqMessage<T> {
    msgId: bigint;
    readCount: number;
    enqueuedAt: Date;
    visibleAt: Date;
    message: T;
}
export declare function enqueue<T>(queueName: string, message: T, delaySeconds?: number): Promise<bigint>;
export declare function dequeue<T>(queueName: string, visibilityTimeoutSeconds: number, quantity: number): Promise<PgmqMessage<T>[]>;
export declare function ack(queueName: string, msgId: bigint): Promise<void>;
export declare function archive(queueName: string, msgId: bigint): Promise<void>;
//# sourceMappingURL=pgmq.d.ts.map