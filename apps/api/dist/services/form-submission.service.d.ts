import type { Prisma } from "@ayushman/db";
export declare function createAndSendFormSubmission(tx: Prisma.TransactionClient, tenantId: string, caseId: string, formTemplateId: string, channel: "EMAIL", client: {
    email?: string | null;
    phone?: string | null;
    fullName?: string | null;
}, workflowRunId?: string, taskId?: string): Promise<void>;
//# sourceMappingURL=form-submission.service.d.ts.map