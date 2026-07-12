import { Router, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { prisma } from "@ayushman/db";

export const meRouter: Router = Router();

// GET /auth/me — data_api_v4.md §3. Identity resolved entirely from the
// verified token; no userId is ever accepted as input.
meRouter.get("/me", async (req: AuthenticatedRequest, res: Response) => {
  const tenant = req.user!.tenantId
    ? await prisma.tenant.findUnique({
        where: { id: req.user!.tenantId },
        select: { slug: true },
      })
    : null;

  res.json({
    data: {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role,
      tenantId: req.user!.tenantId,
      tenant,
    },
  });
});
