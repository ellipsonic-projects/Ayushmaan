import type { Prisma } from "@ayushman/db";

// Where to send the browser back to after a Gmail OAuth round-trip, based on
// which of apps/web's three inbox pages the connecting user belongs to.
// CLIENT is platform-level (no tenantId — see User.tenantId's comment), so
// it's the only role that doesn't need a tenant slug in the path.
export async function resolveInboxReturnPath(
  tx: Prisma.TransactionClient,
  user: { role: string; tenantId: string | null }
): Promise<string | null> {
  if (user.role === "CLIENT") return "/client/inbox";
  if (!user.tenantId) return null;

  const tenant = await tx.tenant.findUnique({
    where: { id: user.tenantId },
    select: { slug: true },
  });
  if (!tenant) return null;

  if (user.role === "TENANT_ADMIN") return `/${tenant.slug}/tenant/admin/inbox`;
  if (user.role === "CONSULTANT") return `/${tenant.slug}/tenant/consultant/inbox`;
  return null;
}
