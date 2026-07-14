export declare function getCaseAuditedForSuperAdmin(caseId: string, actorUserId: string): Promise<{
    id: string;
    status: import("@ayushman/db").$Enums.CaseStatus;
    createdAt: Date;
    updatedAt: Date;
    tenantId: string;
    clientId: string;
    category: import("@ayushman/db").$Enums.ConsultantCategory;
    consultantId: string;
    matterKey: string | null;
    tags: string[];
}>;
//# sourceMappingURL=cases.service.d.ts.map