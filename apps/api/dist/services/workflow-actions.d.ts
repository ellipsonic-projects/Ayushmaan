import type { Prisma } from "@ayushman/db";
import type { CustomActionOperation } from "@ayushman/types/workflow-node-configs";
export declare function runCustomAction(tx: Prisma.TransactionClient, tenantId: string, operation: CustomActionOperation, payload: Record<string, unknown>, context: Record<string, unknown>): Promise<void>;
//# sourceMappingURL=workflow-actions.d.ts.map