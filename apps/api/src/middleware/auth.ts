import { Request, Response, NextFunction } from "express";
import { authVerifier } from "../lib/auth";
import { prisma } from "@ayushman/db";

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

  const user = await prisma.user.findUnique({
    where: { supabaseAuthUserId: identity.providerId },
  });

  if (!user) {
    return res.status(401).json({ error: "No matching account" });
  }

  if (user.accountStatus !== "ACTIVE") {
    return res.status(401).json({ error: "Account suspended" });
  }

  if (identity.emailVerified && !user.emailIsVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailIsVerified: true },
    });
    user.emailIsVerified = true;
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
