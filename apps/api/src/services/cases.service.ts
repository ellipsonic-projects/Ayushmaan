import { withTenantContext } from "@ayushman/db/rls-context";
import { AppError } from "../middleware/errorHandler";
import { writeAuditLog } from "./audit.service";

// A Super Admin reading a single case is cross-tenant by definition (they
// have no tenantId of their own), so every read here is logged — same
// transaction as the read itself, per audit.service.ts's own contract
// ("never a separate, skippable step"). Shared by cases.router.ts's
// GET /:caseId and tests/integration/rls-policies.test.ts so both exercise
// identical semantics.
export async function getCaseAuditedForSuperAdmin(caseId: string, actorUserId: string) {
  return withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: actorUserId },
    async (tx) => {
      const target = await tx.case.findUnique({ where: { id: caseId } });
      if (!target) {
        throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
      }

      await writeAuditLog(tx, {
        tenantId: target.tenantId,
        actorUserId,
        actorRole: "SUPER_ADMIN",
        isCrossTenantAccess: true,
        action: "READ",
        entityType: "case",
        entityId: target.id,
      });

      return target;
    }
  );
}

// SUPER_ADMIN listing all cases for an arbitrary tenant is cross-tenant by
// definition, same rationale as getCaseAuditedForSuperAdmin above — logged
// once per list call rather than once per row.
export async function listCasesAuditedForSuperAdmin(tenantId: string, actorUserId: string) {
  return withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: actorUserId },
    async (tx) => {
      const cases = await tx.case.findMany({
        where: { tenantId, deletedAt: null },
        select: {
          id: true,
          matterKey: true,
          category: true,
          tags: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          client: { select: { fullName: true } },
          consultant: { select: { fullName: true } },
          _count: {
            select: { interactions: true, commitments: true, tasks: true, documents: true },
          },
        },
      });

      await writeAuditLog(tx, {
        tenantId,
        actorUserId,
        actorRole: "SUPER_ADMIN",
        isCrossTenantAccess: true,
        action: "LIST_CASES",
        entityType: "case",
      });

      return cases;
    }
  );
}
