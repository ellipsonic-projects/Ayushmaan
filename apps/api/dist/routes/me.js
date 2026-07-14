"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meRouter = void 0;
const express_1 = require("express");
const db_1 = require("@ayushman/db");
exports.meRouter = (0, express_1.Router)();
// GET /auth/me — data_api_v4.md §3. Identity resolved entirely from the
// verified token; no userId is ever accepted as input.
exports.meRouter.get("/me", async (req, res) => {
    const tenant = req.user.tenantId
        ? await db_1.prisma.tenant.findUnique({
            where: { id: req.user.tenantId },
            select: { slug: true, status: true },
        })
        : null;
    res.json({
        data: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
            tenantId: req.user.tenantId,
            tenant,
        },
    });
});
//# sourceMappingURL=me.js.map