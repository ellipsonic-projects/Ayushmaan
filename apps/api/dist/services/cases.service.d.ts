export declare function getCaseAuditedForSuperAdmin(caseId: string, actorUserId: string): Promise<{
    id: string;
    status: import("@ayushman/db").$Enums.CaseStatus;
    createdAt: Date;
    updatedAt: Date;
    tenantId: string;
    clientId: string;
    category: import("@ayushman/db").$Enums.ConsultantCategory;
    consultantId: string | null;
    matterKey: string | null;
    tags: string[];
    requirements: string | null;
    deletedAt: Date | null;
}>;
export declare function listCasesAuditedForSuperAdmin(tenantId: string, actorUserId: string): Promise<{
    client: {
        fullName: string;
    };
    id: string;
    status: import("@ayushman/db").$Enums.CaseStatus;
    createdAt: Date;
    updatedAt: Date;
    _count: {
        interactions: number;
        commitments: number;
        tasks: number;
        documents: number;
    };
    category: import("@ayushman/db").$Enums.ConsultantCategory;
    matterKey: string | null;
    tags: string[];
    consultant: {
        fullName: string;
    } | null;
}[]>;
//# sourceMappingURL=cases.service.d.ts.map