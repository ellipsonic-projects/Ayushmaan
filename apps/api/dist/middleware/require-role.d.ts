import { Response, NextFunction } from "express";
import type { UserRole } from "@ayushman/db";
import { AuthenticatedRequest } from "./auth";
export declare const requireRole: (...roles: UserRole[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=require-role.d.ts.map