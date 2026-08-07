import { Response, NextFunction } from "express";
import type { UserRole } from "@ayushman/db";
import { AuthenticatedRequest } from "./auth";
import { AppError } from "./errorHandler";

// Route-level guard mirroring PRD_v3_nextjs_express.md §1.4's permission
// matrix. Must run after authMiddleware (needs req.user).
export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role as UserRole)) {
      return next(new AppError(403, "Forbidden", "ROLE_FORBIDDEN"));
    }
    next();
  };
};
