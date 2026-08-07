import type { Prisma, NotificationType } from "@ayushman/db";
export interface DispatchMessage {
    subject: string;
    body: string;
}
interface DispatchInput {
    tenantId: string;
    userId: string;
    type: NotificationType;
    message: DispatchMessage;
    payload?: Prisma.InputJsonValue;
}
export declare function dispatchConsultantOnboarded(tx: Prisma.TransactionClient, { tenantId, newConsultantName, excludeUserId, }: {
    tenantId: string;
    newConsultantName: string;
    excludeUserId: string;
}): Promise<void>;
export declare function dispatchTenantSignupPending(tx: Prisma.TransactionClient, { tenantId, tenantDisplayName }: {
    tenantId: string;
    tenantDisplayName: string;
}): Promise<void>;
export declare function dispatchTenantApprovalDecision(tx: Prisma.TransactionClient, { tenantId, approved, rejectionReason, }: {
    tenantId: string;
    approved: boolean;
    rejectionReason?: string;
}): Promise<void>;
export declare function alreadyNotified(tx: Prisma.TransactionClient, { userId, type, entityKey, entityId, }: {
    userId: string;
    type: NotificationType;
    entityKey: string;
    entityId: string;
}): Promise<boolean>;
export declare function getPreferredLeadTimeMins(tx: Prisma.TransactionClient, { userId, type, defaultMins }: {
    userId: string;
    type: NotificationType;
    defaultMins: number;
}): Promise<number>;
export declare function dispatch(tx: Prisma.TransactionClient, { tenantId, userId, type, message, payload }: DispatchInput): Promise<void>;
export {};
//# sourceMappingURL=notification.service.d.ts.map