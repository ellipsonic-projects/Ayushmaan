import { Response, NextFunction } from "express";
import type { TenantContext } from "@ayushman/db/rls-context";
import { AuthenticatedRequest } from "./auth";
export interface TenantScopedRequest extends AuthenticatedRequest {
    tenant?: {
        id: string;
        slug: string;
        displayName: string;
        status: string;
    };
    tenantContext?: TenantContext;
}
export declare const tenantContextMiddleware: (req: TenantScopedRequest, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=tenant-context.d.ts.map