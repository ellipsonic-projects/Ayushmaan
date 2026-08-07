import type { Prisma } from "@ayushman/db";
export declare function enqueueEventTriggers(tx: Prisma.TransactionClient, tenantId: string, eventName: string, context: Record<string, unknown>, matchFormTemplateId?: string): Promise<void>;
//# sourceMappingURL=workflow-events.d.ts.map