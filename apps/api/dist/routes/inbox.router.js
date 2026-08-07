"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inboxRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const rls_context_1 = require("@ayushman/db/rls-context");
const errorHandler_1 = require("../middleware/errorHandler");
const oauth_state_1 = require("../lib/oauth-state");
const token_encryption_1 = require("../lib/token-encryption");
const inbox_return_path_1 = require("../lib/inbox-return-path");
const google_1 = require("../integrations/google");
// Mounted at /api/inbox, ahead of tenantContextMiddleware (see index.ts) —
// every role (TENANT_ADMIN, CONSULTANT, CLIENT) connects and manages their
// own Gmail independently, and CLIENT has no tenant to scope a route under.
exports.inboxRouter = (0, express_1.Router)();
function tenantContextFor(req) {
    return {
        tenantId: req.user.tenantId,
        isSuperAdmin: req.user.role === "SUPER_ADMIN",
        userId: req.user.id,
    };
}
async function findConnection(tx, userId) {
    return tx.inboxConnection.findUnique({
        where: { userId_provider: { userId, provider: "GOOGLE" } },
    });
}
async function requireActiveConnection(tx, userId) {
    const connection = await findConnection(tx, userId);
    if (!connection || connection.status !== "ACTIVE") {
        throw new errorHandler_1.AppError(409, "No active inbox connection", "INBOX_NOT_CONNECTED");
    }
    return connection;
}
// GET /inbox/connection
exports.inboxRouter.get("/connection", async (req, res) => {
    const connection = await (0, rls_context_1.withTenantContext)(tenantContextFor(req), (tx) => findConnection(tx, req.user.id));
    res.json({
        data: connection
            ? {
                connected: connection.status === "ACTIVE",
                emailAddress: connection.emailAddress,
                status: connection.status,
            }
            : { connected: false, emailAddress: null, status: null },
    });
});
// GET /inbox/connect-url — apps/web redirects the full page to this URL;
// apps/web has no backend of its own to proxy through (docs/project-structure.md).
exports.inboxRouter.get("/connect-url", async (req, res) => {
    const returnPath = await (0, rls_context_1.withTenantContext)(tenantContextFor(req), (tx) => (0, inbox_return_path_1.resolveInboxReturnPath)(tx, req.user));
    if (!returnPath) {
        throw new errorHandler_1.AppError(400, "This account can't connect an inbox", "INBOX_UNSUPPORTED_ROLE");
    }
    const state = (0, oauth_state_1.createOAuthState)(req.user.id, returnPath);
    res.json({ data: { url: (0, google_1.buildGoogleAuthUrl)(state) } });
});
// DELETE /inbox/connection
exports.inboxRouter.delete("/connection", async (req, res) => {
    await (0, rls_context_1.withTenantContext)(tenantContextFor(req), async (tx) => {
        const connection = await findConnection(tx, req.user.id);
        if (!connection)
            throw new errorHandler_1.AppError(404, "No inbox connected", "INBOX_NOT_CONNECTED");
        await (0, google_1.revokeToken)((0, token_encryption_1.decryptToken)(connection.refreshTokenEnc));
        await tx.inboxConnection.delete({ where: { id: connection.id } });
    });
    res.status(204).send();
});
// GET /inbox/threads
exports.inboxRouter.get("/threads", async (req, res) => {
    const threads = await (0, rls_context_1.withTenantContext)(tenantContextFor(req), async (tx) => {
        const connection = await requireActiveConnection(tx, req.user.id);
        const accessToken = await (0, google_1.getValidAccessToken)(connection, tx);
        return (0, google_1.listThreads)(accessToken);
    });
    res.json({ data: threads });
});
// GET /inbox/threads/:threadId
exports.inboxRouter.get("/threads/:threadId", async (req, res) => {
    const messages = await (0, rls_context_1.withTenantContext)(tenantContextFor(req), async (tx) => {
        const connection = await requireActiveConnection(tx, req.user.id);
        const accessToken = await (0, google_1.getValidAccessToken)(connection, tx);
        return (0, google_1.getThread)(accessToken, req.params.threadId);
    });
    res.json({ data: messages });
});
const sendMailSchema = zod_1.z
    .object({
    to: zod_1.z.string().min(1),
    cc: zod_1.z.string().optional(),
    bcc: zod_1.z.string().optional(),
    subject: zod_1.z.string().min(1),
    html: zod_1.z.string(),
})
    .strict();
// POST /inbox/send
exports.inboxRouter.post("/send", async (req, res) => {
    const body = sendMailSchema.parse(req.body);
    await (0, rls_context_1.withTenantContext)(tenantContextFor(req), async (tx) => {
        const connection = await requireActiveConnection(tx, req.user.id);
        const accessToken = await (0, google_1.getValidAccessToken)(connection, tx);
        await (0, google_1.sendMessage)(accessToken, { fromEmail: connection.emailAddress, ...body });
    });
    res.status(204).send();
});
//# sourceMappingURL=inbox.router.js.map