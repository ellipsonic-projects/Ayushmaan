import type { Prisma, Case } from "@ayushman/db";
import { AppError } from "../middleware/errorHandler";
import { getOwnConsultantProfileId } from "./callerProfile";

// Shared by the case-scoped write routers (interactions/commitments/tasks) —
// loads the case and confirms the caller is its own consultant.
export async function loadOwnConsultantCase(
  tx: Prisma.TransactionClient,
  tenantId: string,
  caseId: string,
  userId: string
): Promise<Case> {
  const found = await tx.case.findUnique({ where: { id: caseId } });
  if (!found || found.tenantId !== tenantId) {
    throw new AppError(404, "Case not found", "CASE_NOT_FOUND");
  }

  const consultantId = await getOwnConsultantProfileId(tx, userId);
  if (consultantId !== found.consultantId) {
    throw new AppError(403, "Forbidden", "NOT_OWN_CASE");
  }

  return found;
}
