import type { ConsultantCategory, Prisma } from "@ayushman/db";
export declare function createOrReuseCase(tx: Prisma.TransactionClient, params: {
    tenantId: string;
    clientId: string;
    consultantId: string;
    category: ConsultantCategory;
    matterKey?: string;
    requirementsSubject?: string;
    requirements?: string;
    dedupe?: boolean;
}): Promise<{
    case: {
        id: string;
        status: import("@ayushman/db").$Enums.CaseStatus;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        category: import("@ayushman/db").$Enums.ConsultantCategory;
        clientId: string;
        consultantId: string | null;
        matterKey: string | null;
        tags: string[];
        requirementsSubject: string | null;
        requirements: string | null;
        deletedAt: Date | null;
    };
    isNew: boolean;
}>;
export declare function assertGuardianConsentIfMinor(tx: Prisma.TransactionClient, clientId: string): Promise<void>;
export declare function assertNoConflict(tx: Prisma.TransactionClient, params: {
    consultantId: string;
    scheduledStart: Date;
    scheduledEnd: Date;
    excludeAppointmentId?: string;
}): Promise<void>;
export declare function assertNoOutOfOfficeConflict(tx: Prisma.TransactionClient, params: {
    consultantId: string;
    scheduledStart: Date;
}): Promise<void>;
export declare function assertNoSameDayAppointmentWithConsultant(tx: Prisma.TransactionClient, params: {
    clientId: string;
    consultantId: string;
    scheduledStart: Date;
}): Promise<void>;
export declare function assertWithinCancellationCutoff(tx: Prisma.TransactionClient, params: {
    tenantId: string;
    scheduledStart: Date;
}): Promise<void>;
export interface RecurrenceRule {
    dayOfWeek: number;
    startTime: string;
    durationMins: number;
    startDate: string;
    endDate?: string;
    occurrenceCount?: number;
}
export declare function expandOccurrences(rule: RecurrenceRule): Array<{
    start: Date;
    end: Date;
}>;
//# sourceMappingURL=booking.service.d.ts.map