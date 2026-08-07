import { Router, Request, Response } from "express";
import { withTenantContext } from "@ayushman/db/rls-context";
import { verifyOAuthState } from "../lib/oauth-state";
import { exchangeCodeForTokens, getGmailProfile } from "../integrations/google";
import { encryptToken } from "../lib/token-encryption";

// Google redirects the browser here with no Authorization header, so this
// can't sit behind authMiddleware (see index.ts) — mounted ahead of it, same
// as auth-register.router.ts, except identity comes from the signed `state`
// param (lib/oauth-state.ts) instead of a Supabase token. `state` also
// carries the return path chosen when the connect-url was issued
// (inbox.router.ts), so both the success and failure redirects land back on
// whichever of apps/web's three inbox pages (admin/consultant/client) the
// connecting user came from.
export const googleOAuthCallbackRouter: Router = Router();

googleOAuthCallbackRouter.get("/google/callback", async (req: Request, res: Response) => {
  const webAppUrl = process.env.WEB_APP_URL ?? "";
  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  const state = typeof req.query.state === "string" ? req.query.state : undefined;

  if (!code || !state) return res.redirect(302, `${webAppUrl}/`);

  const verified = verifyOAuthState(state);
  if (!verified) return res.redirect(302, `${webAppUrl}/`);

  const failRedirect = () => res.redirect(302, `${webAppUrl}${verified.returnPath}?inbox=error`);

  try {
    const tokens = await exchangeCodeForTokens(code);
    const profile = await getGmailProfile(tokens.accessToken);

    const connected = await withTenantContext(
      { tenantId: null, isSuperAdmin: true, userId: verified.userId },
      async (tx) => {
        const user = await tx.user.findUnique({ where: { id: verified.userId } });
        if (!user) return false;

        const tokenFields = {
          tenantId: user.tenantId,
          emailAddress: profile.emailAddress,
          accessTokenEnc: encryptToken(tokens.accessToken),
          refreshTokenEnc: encryptToken(tokens.refreshToken),
          tokenExpiresAt: tokens.expiresAt,
          scope: tokens.scope,
          status: "ACTIVE" as const,
        };

        await tx.inboxConnection.upsert({
          where: { userId_provider: { userId: verified.userId, provider: "GOOGLE" } },
          create: { userId: verified.userId, provider: "GOOGLE", ...tokenFields },
          update: tokenFields,
        });

        return true;
      }
    );

    if (!connected) return failRedirect();
    return res.redirect(302, `${webAppUrl}${verified.returnPath}?inbox=connected`);
  } catch (err) {
    console.error(err);
    return failRedirect();
  }
});
