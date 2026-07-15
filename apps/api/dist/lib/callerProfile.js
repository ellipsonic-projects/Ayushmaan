"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOwnConsultantProfileId = getOwnConsultantProfileId;
exports.getOwnClientProfileId = getOwnClientProfileId;
// Row-ownership checks throughout clients/consultants/appointments routers
// need "which consultant_profiles/client_profiles row belongs to the caller"
// — resolved from the verified req.user.id, never client-supplied.
async function getOwnConsultantProfileId(tx, userId) {
    const profile = await tx.consultantProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    return profile?.id ?? null;
}
async function getOwnClientProfileId(tx, userId) {
    const profile = await tx.clientProfile.findUnique({ where: { userId }, select: { id: true } });
    return profile?.id ?? null;
}
//# sourceMappingURL=callerProfile.js.map