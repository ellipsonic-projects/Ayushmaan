"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCaseContext = buildCaseContext;
exports.buildConsultantContext = buildConsultantContext;
// Assembles the client.*/consultant.*/case.* merge-field base every workflow
// event trigger shares — template-render.service.ts resolves these dot-paths
// against workflow_runs.context, and workflow-node-handlers.ts's SEND_* node
// reads client.email/client.phone off the same shape. Callers merge in
// whatever's specific to their event (appointment.*, task.*, document.*) on
// top of this. organization.* is also read directly by template-header.ts to
// build the header prepended to sent/shared templates.
async function buildCaseContext(tx, caseId) {
    const found = await tx.case.findUniqueOrThrow({
        where: { id: caseId },
        include: {
            client: { include: { user: { select: { email: true, phone: true } } } },
            consultant: { include: { user: { select: { email: true, phone: true } } } },
        },
    });
    const tenant = await tx.tenant.findUniqueOrThrow({
        where: { id: found.tenantId },
        select: { displayName: true, phone: true, address: true },
    });
    const admin = await tx.user.findFirst({
        where: { tenantId: found.tenantId, role: "TENANT_ADMIN" },
        select: { email: true, phone: true },
    });
    return {
        case: { id: found.id, category: found.category, status: found.status, tags: found.tags },
        client: {
            id: found.client.id,
            name: found.client.fullName,
            email: found.client.user.email,
            phone: found.client.user.phone,
        },
        consultant: found.consultant
            ? {
                id: found.consultant.id,
                name: found.consultant.fullName,
                email: found.consultant.user.email,
                phone: found.consultant.user.phone,
            }
            : null,
        organization: {
            name: tenant.displayName,
            phone: tenant.phone ?? "",
            address: tenant.address ?? "",
            adminEmail: admin?.email ?? "",
            adminPhone: admin?.phone ?? "",
        },
    };
}
// Same consultant.*/organization.* shape as buildCaseContext above, minus
// case/client — used by a SCHEDULE-triggered TENANT/COMMUNITY workflow's
// per-consultant fan-out (cron/workflow-triggers.ts's sweepScheduledWorkflows),
// which has no case to hang the run's context off of.
//
// Also includes today's approved appointments (times in the consultant's local
// timezone) so a SCHEDULE workflow can send a daily report via SEND_EMAIL.
async function buildConsultantContext(tx, consultantId) {
    const consultant = await tx.consultantProfile.findUniqueOrThrow({
        where: { id: consultantId },
        include: { user: { select: { email: true, phone: true } } },
    });
    const tenant = await tx.tenant.findUniqueOrThrow({
        where: { id: consultant.tenantId },
        select: { displayName: true, phone: true, address: true },
    });
    const admin = await tx.user.findFirst({
        where: { tenantId: consultant.tenantId, role: "TENANT_ADMIN" },
        select: { email: true, phone: true },
    });
    // Fetch today's approved appointments for this consultant.
    const tz = consultant.timezone || "Asia/Kolkata";
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setUTCHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setUTCHours(23, 59, 59, 999);
    const appointments = await tx.appointment.findMany({
        where: {
            status: "APPROVED",
            scheduledStart: { gte: startOfToday, lte: endOfToday },
            case: { consultantId },
        },
        include: {
            case: { include: { client: { include: { user: { select: { email: true } } } } } },
        },
        orderBy: { scheduledStart: "asc" },
    });
    const appointmentList = appointments.map((appt) => ({
        clientName: appt.case.client?.fullName ?? "Client",
        clientEmail: appt.case.client?.user?.email ?? "",
        date: appt.scheduledStart.toLocaleDateString("en-US", { timeZone: tz }),
        time: appt.scheduledStart.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: tz,
        }),
        meetingLink: appt.meetingLink ?? "",
    }));
    // Pre-formatted text block for templates that reference
    // consultant.todayAppointments — each appointment on its own line.
    const todayAppointments = appointmentList
        .map((a) => `${a.time} — ${a.clientName}${a.meetingLink ? ` (${a.meetingLink})` : ""}`)
        .join("\n");
    return {
        consultant: {
            id: consultant.id,
            name: consultant.fullName,
            email: consultant.user.email,
            phone: consultant.user.phone,
        },
        organization: {
            name: tenant.displayName,
            phone: tenant.phone ?? "",
            address: tenant.address ?? "",
            adminEmail: admin?.email ?? "",
            adminPhone: admin?.phone ?? "",
        },
        todayAppointments,
        todayAppointmentCount: appointmentList.length,
        todayAppointmentList: appointmentList,
    };
}
//# sourceMappingURL=workflow-context.js.map