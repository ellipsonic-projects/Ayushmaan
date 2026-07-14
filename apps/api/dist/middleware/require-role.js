"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = void 0;
const errorHandler_1 = require("./errorHandler");
// Route-level guard mirroring PRD_v3_nextjs_express.md §1.4's permission
// matrix. Must run after authMiddleware (needs req.user).
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return next(new errorHandler_1.AppError(403, "Forbidden", "ROLE_FORBIDDEN"));
        }
        next();
    };
};
exports.requireRole = requireRole;
//# sourceMappingURL=require-role.js.map