import type { Prisma } from "@ayushman/db";
export declare function assertNoConflict(tx: Prisma.TransactionClient, params: {
    consultantId: string;
    scheduledStart: Date;
    scheduledEnd: Date;
    excludeAppointmentId?: string;
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