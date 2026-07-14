import { Request, Response, NextFunction } from "express";
import { authVerifier } from "../lib/auth";
import { withTenantContext } from "@ayushman/db/rls-context";

const SYSTEM_LOOKUP_USER_ID = "00000000-0000-0000-0000-000000000000";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    supabaseAuthUserId: string;
    email: string;
    role: string;
    tenantId: string | null;
  };
}

// apps/api never issues or stores tokens — it only verifies the caller's
// access token on every request (data_api_v3.md §4.7), via the AuthVerifier
// abstraction (lib/auth) so the identity provider can be swapped without
// touching this file. Tenant resolution (SET LOCAL app.tenant_id for RLS)
// is deferred until tenants are onboarded.
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const identity = await authVerifier.verifyToken(token);
  if (!identity) {
    return res.status(401).json({ error: "Invalid token" });
  }

  // The caller's tenant/role isn't known yet at this point, so there's no
  // app.tenant_id to SET LOCAL for RLS — bypass it here the same way
  // getTenant.ts does for tenant slug lookups.
  const user = await withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: SYSTEM_LOOKUP_USER_ID },
    async (tx) => {
      const found = await tx.user.findUnique({
        where: { supabaseAuthUserId: identity.providerId },
      });
      if (!found) return null;

      if (identity.emailVerified && !found.emailIsVerified) {
        await tx.user.update({
          where: { id: found.id },
          data: { emailIsVerified: true },
        });
        found.emailIsVerified = true;
      }

      return found;
    }
  );

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
