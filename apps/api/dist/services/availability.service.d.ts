import type { Prisma } from "@ayushman/db";
interface AvailabilityTemplate {
    dayOfWeek: number | null;
    specificDate: Date | null;
    startTime: Date;
    endTime: Date;
    slotDurationMins: number;
}
interface AppointmentWindow {
    scheduledStart: Date;
    scheduledEnd: Date;
}
export interface DiscreteAvailabilityInstance {
    start: string;
    end: string;
    durationMins: number;
    dateKey: string;
}
export declare function generateDiscreteAvailability(templates: AvailabilityTemplate[], appointments: AppointmentWindow[], from: Date, to: Date, cutoffMs: number, now: number): DiscreteAvailabilityInstance[];
export declare function applyTenantAvailabilityDefaults(tx: Prisma.TransactionClient, tenantId: string, consultantId: string): Promise<{
    id: string;
    status: import("@ayushman/db").$Enums.SlotStatus;
    tenantId: string;
    dayOfWeek: number | null;
    startTime: Date;
    endTime: Date;
    slotDurationMins: number;
    consultantId: string;
    specificDate: Date | null;
    version: number;
}[]>;
export {};
//# sourceMappingURL=availability.service.d.ts.map