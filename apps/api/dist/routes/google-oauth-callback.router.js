"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleOAuthCallbackRouter = void 0;
const express_1 = require("express");
const rls_context_1 = require("@ayushman/db/rls-context");
const oauth_state_1 = require("../lib/oauth-state");
const google_1 = require("../integrations/google");
const token_encryption_1 = require("../lib/token-encryption");
// Google redirects the browser here with no Authorization header, so this
// can't sit behind authMiddleware (see index.ts) — mounted ahead of it, same
// as auth-register.router.ts, except identity comes from the signed `state`
// param (lib/oauth-state.ts) instead of a Supabase token. `state` also
// carries the return path chosen when the connect-url was issued
// (inbox.router.ts), so both the success and failure redirects land back on
// whichever of apps/web's three inbox pages (admin/consultant/client) the
// connecting user came from.
exports.googleOAuthCallbackRouter = (0, express_1.Router)();
exports.googleOAuthCallbackRouter.get("/google/callback", async (req, res) => {
    const webAppUrl = process.env.WEB_APP_URL ?? "";
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    if (!code || !state)
        return res.redirect(302, `${webAppUrl}/`);
    const verified = (0, oauth_state_1.verifyOAuthState)(state);
    if (!verified)
        return res.redirect(302, `${webAppUrl}/`);
    const failRedirect = () => res.redirect(302, `${webAppUrl}${verified.returnPath}?inbox=error`);
    try {
        const tokens = await (0, google_1.exchangeCodeForTokens)(code);
        const profile = await (0, google_1.getGmailProfile)(tokens.accessToken);
        const connected = await (0, rls_context_1.withTenantContext)({ tenantId: null, isSuperAdmin: true, userId: verified.userId }, async (tx) => {
            const user = await tx.user.findUnique({ where: { id: verified.userId } });
            if (!user)
                return false;
            const tokenFields = {
                tenantId: user.tenantId,
                emailAddress: profile.emailAddress,
                accessTokenEnc: (0, token_encryption_1.encryptToken)(tokens.accessToken),
                refreshTokenEnc: (0, token_encryption_1.encryptToken)(tokens.refreshToken),
                tokenExpiresAt: tokens.expiresAt,
                scope: tokens.scope,
                status: "ACTIVE",
            };
            await tx.inboxConnection.upsert({
                where: { userId_provider: { userId: verified.userId, provider: "GOOGLE" } },
                create: { userId: verified.userId, provider: "GOOGLE", ...tokenFields },
                update: tokenFields,
            });
            return true;
        });
        if (!connected)
            return failRedirect();
        return res.redirect(302, `${webAppUrl}${verified.returnPath}?inbox=connected`);
    }
    catch (err) {
        console.error(err);
        return failRedirect();
    }
});
//# sourceMappingURL=google-oauth-callback.router.js.map