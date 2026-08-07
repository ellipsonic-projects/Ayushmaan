import cron from "node-cron";
import { withTenantContext } from "@ayushman/db/rls-context";

// Sprint 3.4 item 4 — a REQUESTED appointment nobody actioned within
// tenant_settings.request_expiry_hours (appointments.router.ts sets
// requestExpiresAt at creation time) auto-cancels. Runs cross-tenant under
// an is_super_admin context since no single tenant scope applies; the
// appointments RLS policy bypasses tenant_id matching for that flag
// (supabase/policies/00-tenant-isolation.sql).
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";

export async function expireOverdueRequests(): Promise<number> {
  return withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: SYSTEM_USER_ID },
    async (tx) => {
      const { count } = await tx.appointment.updateMany({
        where: { status: "REQUESTED", requestExpiresAt: { lte: new Date() } },
        data: {
          status: "CANCELLED",
          cancellationReason: "Auto-expired — no admin action within the review window",
        },
      });
      return count;
    }
  );
}

export function startExpireRequestsCron() {
  // Every 15 minutes — frequent enough that a 24h-default window never
  // slips by more than a few minutes past its deadline.
  cron.schedule("*/15 * * * *", () => {
    expireOverdueRequests().catch((err) => {
      console.error("[cron] expire-requests failed:", err);
    });
  });
}
