import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./client";

export interface TenantContext {
  /** null only for a SUPER_ADMIN acting platform-wide (no tenant row applies). */
  tenantId: string | null;
  isSuperAdmin: boolean;
  /** Supabase auth user id — required for audit_logs / grievance ownership policies. */
  userId: string;
}

type TransactionClient = Prisma.TransactionClient;

/**
 * Opens a DB transaction and pushes the caller's tenant/role claims into
 * Postgres session vars via SET LOCAL, which is what every RLS policy in
 * supabase/policies/*.sql filters on (schema §4.1/§4.2). SET LOCAL scopes the
 * setting to this transaction only, so it can't leak across requests on a
 * pooled connection. Every tenant-scoped query in apps/api must run inside
 * this wrapper — a bare `prisma.*` call outside of it bypasses RLS's only
 * enforcement input.
 */
export async function withTenantContext<T>(
  context: TenantContext,
  fn: (tx: TransactionClient) => Promise<T>,
  client: PrismaClient = prisma
): Promise<T> {
  return client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SET LOCAL app.tenant_id = '${escapeLiteral(context.tenantId ?? "")}'`
    );
    await tx.$executeRawUnsafe(
      `SET LOCAL app.is_super_admin = '${context.isSuperAdmin ? "true" : "false"}'`
    );
    await tx.$executeRawUnsafe(`SET LOCAL app.user_id = '${escapeLiteral(context.userId)}'`);

    return fn(tx);
  });
}

// SET LOCAL doesn't accept bind parameters, so the value has to be inlined —
// this only ever carries a UUID or boolean sourced from a verified JWT, never
// raw client input, but the quote is still escaped defensively.
function escapeLiteral(value: string): string {
  return value.replace(/'/g, "''");
}
