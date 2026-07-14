import type { Prisma } from "@ayushman/db";

// Row-ownership checks throughout clients/consultants/appointments routers
// need "which consultant_profiles/client_profiles row belongs to the caller"
// — resolved from the verified req.user.id, never client-supplied.
export async function getOwnConsultantProfileId(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<string | null> {
  const profile = await tx.consultantProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

export async function getOwnClientProfileId(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<string | null> {
  const profile = await tx.clientProfile.findUnique({ where: { userId }, select: { id: true } });
  return profile?.id ?? null;
}
