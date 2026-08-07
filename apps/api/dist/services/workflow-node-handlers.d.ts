import type { Prisma } from "@ayushman/db";
import type { WorkflowGraphNode } from "@ayushman/types/workflow";
export interface NodeHandlerResult {
    sourceHandle?: string;
    resumeAt?: Date;
    waitingOnForm?: boolean;
}
type NodeHandler = (tx: Prisma.TransactionClient, tenantId: string, runId: string, node: WorkflowGraphNode, context: Record<string, unknown>) => Promise<NodeHandlerResult>;
export declare const nodeHandlers: Record<WorkflowGraphNode["type"], NodeHandler>;
export {};
//# sourceMappingURL=workflow-node-handlers.d.ts.map