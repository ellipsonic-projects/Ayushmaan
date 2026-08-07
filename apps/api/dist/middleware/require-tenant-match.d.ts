import { Response, NextFunction } from "express";
import { TenantScopedRequest } from "./tenant-context";
export declare const requireTenantMatch: (req: TenantScopedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=require-tenant-match.d.ts.map