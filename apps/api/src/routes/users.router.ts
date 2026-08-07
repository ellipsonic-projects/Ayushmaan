import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { withTenantContext } from "@ayushman/db/rls-context";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";
import { enqueueEventTriggers } from "../lib/workflow-events";
import { phoneSchema, optionalPhoneSchema } from "../lib/phone";

// data_api_v4.md §6 — users. Mounted at /api/tenants/:tenantId/users
// (mergeParams so :tenantId from the parent mount is visible here).
export const usersRouter: Router = Router({ mergeParams: true });
usersRouter.use(requireTenantMatch);

const listUsersQuerySchema = z.object({
  role: z.enum(["SUPER_ADMIN", "TENANT_ADMIN", "CONSULTANT", "CLIENT"]).optional(),
  accountStatus: z.enum(["ACTIVE", "SUSPENDED", "BANNED", "DELETED"]).optional(),
  search: z.string().optional(),
});

// GET /tenants/:tenantId/users
usersRouter.get(
  "/",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const query = listUsersQuerySchema.parse(req.query);

    const users = await withTenantContext(req.tenantContext!, (tx) =>
      tx.user.findMany({
        where: {
          tenantId: req.params.tenantId,
          role: query.role,
          accountStatus: query.accountStatus,
          ...(query.search && { email: { contains: query.search, mode: "insensitive" } }),
        },
        orderBy: { createdAt: "desc" },
      })
    );

    res.json({ data: users });
  }
);

const createUserSchema = z
  .object({
    email: z.string().email(),
    role: z.enum(["TENANT_ADMIN", "CONSULTANT", "CLIENT"]),
    phone: phoneSchema,
  })
  .strict();

// POST /tenants/:tenantId/users — invites via Supabase Admin API + creates
// the public.users row. A TENANT_ADMIN may only invite role=CONSULTANT
// (self-escalation guard, data_api_v4.md §6); SUPER_ADMIN may invite any role.
usersRouter.post(
  "/",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const body = createUserSchema.parse(req.body);

    if (req.user!.role === "TENANT_ADMIN" && body.role !== "CONSULTANT") {
      throw new AppError(
        403,
        "A Tenant Admin may only invite users with role=CONSULTANT",
        "SELF_ESCALATION_BLOCKED"
      );
    }

    const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      body.email
    );
    if (inviteError || !invited.user) {
      throw new AppError(
        502,
        `Failed to invite user: ${inviteError?.message ?? "unknown error"}`,
        "INVITE_FAILED"
      );
    }

    const user = await withTenantContext(req.tenantContext!, async (tx) => {
      const created = await tx.user.create({
        data: {
          supabaseAuthUserId: invited.user!.id,
          tenantId: req.params.tenantId,
          role: body.role,
          email: body.email,
          phone: body.phone,
          emailIsVerified: !!invited.user.email_confirmed_at,
        },
      });

      await enqueueEventTriggers(tx, req.params.tenantId, "USER_INVITED", {
        user: { id: created.id, role: created.role, email: created.email },
      });

      return created;
    });

    res.status(201).json({ data: user });
  }
);

function requireSelfOrAdmin(req: TenantScopedRequest, res: Response, next: NextFunction) {
  const isAdmin = req.user!.role === "TENANT_ADMIN" || req.user!.role === "SUPER_ADMIN";
  const isSelf = req.params.userId === req.user!.id;
  if (!isAdmin && !isSelf) {
    return next(new AppError(403, "Forbidden", "ROLE_FORBIDDEN"));
  }
  next();
}

// GET /tenants/:tenantId/users/:userId
usersRouter.get("/:userId", requireSelfOrAdmin, async (req: TenantScopedRequest, res: Response) => {
  const user = await withTenantContext(req.tenantContext!, (tx) =>
    tx.user.findUnique({ where: { id: req.params.userId } })
  );
  if (!user || user.tenantId !== req.params.tenantId) {
    throw new AppError(404, "User not found", "USER_NOT_FOUND");
  }
  res.json({ data: user });
});

const patchUserSchema = z
  .object({
    accountStatus: z.enum(["ACTIVE", "SUSPENDED", "BANNED", "DELETED"]).optional(),
    phone: optionalPhoneSchema,
  })
  .strict();

// PATCH /tenants/:tenantId/users/:userId — a TENANT_ADMIN cannot target a
// SUPER_ADMIN or another TENANT_ADMIN row (checked against the target row's
// role, not just the tenant match).
usersRouter.patch(
  "/:userId",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const updates = patchUserSchema.parse(req.body);

    const user = await withTenantContext(req.tenantContext!, async (tx) => {
      const target = await tx.user.findUnique({ where: { id: req.params.userId } });
      if (!target || target.tenantId !== req.params.tenantId) {
        throw new AppError(404, "User not found", "USER_NOT_FOUND");
      }
      if (
        req.user!.role === "TENANT_ADMIN" &&
        (target.role === "TENANT_ADMIN" || target.role === "SUPER_ADMIN")
      ) {
        throw new AppError(
          403,
          "A Tenant Admin cannot modify an admin-level account",
          "SELF_ESCALATION_BLOCKED"
        );
      }
      return tx.user.update({ where: { id: req.params.userId }, data: updates });
    });

    res.json({ data: user });
  }
);

// DELETE /tenants/:tenantId/users/:userId — soft-deactivate only
// (accountStatus = DELETED); PII cleared 30 days later by a background job,
// not this call.
usersRouter.delete(
  "/:userId",
  requireRole("TENANT_ADMIN", "SUPER_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const user = await withTenantContext(req.tenantContext!, async (tx) => {
      const target = await tx.user.findUnique({ where: { id: req.params.userId } });
      if (!target || target.tenantId !== req.params.tenantId) {
        throw new AppError(404, "User not found", "USER_NOT_FOUND");
      }
      if (
        req.user!.role === "TENANT_ADMIN" &&
        (target.role === "TENANT_ADMIN" || target.role === "SUPER_ADMIN")
      ) {
        throw new AppError(
          403,
          "A Tenant Admin cannot deactivate an admin-level account",
          "SELF_ESCALATION_BLOCKED"
        );
      }
      return tx.user.update({
        where: { id: req.params.userId },
        data: { accountStatus: "DELETED" },
      });
    });

    res.json({ data: user });
  }
);
