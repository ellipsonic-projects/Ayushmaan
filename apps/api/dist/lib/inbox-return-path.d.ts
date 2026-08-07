import type { Prisma } from "@ayushman/db";
export declare function resolveInboxReturnPath(tx: Prisma.TransactionClient, user: {
    role: string;
    tenantId: string | null;
}): Promise<string | null>;
//# sourceMappingURL=inbox-return-path.d.ts.map