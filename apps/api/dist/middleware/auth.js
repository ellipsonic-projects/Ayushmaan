"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const auth_1 = require("../lib/auth");
const db_1 = require("@ayushman/db");
// apps/api never issues or stores tokens — it only verifies the caller's
// access token on every request (data_api_v3.md §4.7), via the AuthVerifier
// abstraction (lib/auth) so the identity provider can be swapped without
// touching this file. Tenant resolution (SET LOCAL app.tenant_id for RLS)
// is deferred until tenants are onboarded.
const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const identity = await auth_1.authVerifier.verifyToken(token);
    if (!identity) {
        return res.status(401).json({ error: "Invalid token" });
    }
    const user = await db_1.prisma.user.findUnique({
        where: { supabaseAuthUserId: identity.providerId },
    });
    if (!user) {
        return res.status(401).json({ error: "No matching account" });
    }
    if (user.accountStatus !== "ACTIVE") {
        return res.status(401).json({ error: "Account suspended" });
    }
    req.user = {
        id: user.id,
        supabaseAuthUserId: user.supabaseAuthUserId,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
    };
    next();
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=auth.js.map