import type { Prisma } from "@ayushman/db";
export declare function getOwnConsultantProfileId(tx: Prisma.TransactionClient, userId: string): Promise<string | null>;
export declare function getOwnClientProfileId(tx: Prisma.TransactionClient, userId: string): Promise<string | null>;
export declare function isClientProfileAccessibleToUser(tx: Prisma.TransactionClient, userId: string, clientId: string): Promise<boolean>;
//# sourceMappingURL=callerProfile.d.ts.map