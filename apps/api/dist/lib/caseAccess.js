"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadOwnConsultantCase = loadOwnConsultantCase;
const errorHandler_1 = require("../middleware/errorHandler");
const callerProfile_1 = require("./callerProfile");
// Shared by the case-scoped write routers (interactions/commitments/tasks) —
// loads the case and confirms the caller is its own consultant.
async function loadOwnConsultantCase(tx, tenantId, caseId, userId) {
    const found = await tx.case.findUnique({ where: { id: caseId } });
    if (!found || found.tenantId !== tenantId) {
        throw new errorHandler_1.AppError(404, "Case not found", "CASE_NOT_FOUND");
    }
    const consultantId = await (0, callerProfile_1.getOwnConsultantProfileId)(tx, userId);
    if (consultantId !== found.consultantId) {
        throw new errorHandler_1.AppError(403, "Forbidden", "NOT_OWN_CASE");
    }
    return found;
}
//# sourceMappingURL=caseAccess.js.map