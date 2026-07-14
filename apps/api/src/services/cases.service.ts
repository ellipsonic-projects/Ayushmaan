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
