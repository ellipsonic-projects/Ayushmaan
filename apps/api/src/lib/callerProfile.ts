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

// A CLIENT may act as themselves, or on behalf of a dependent they're a
// consented guardian for (schema §3.7 guardian_links) — e.g. booking an
// appointment for a linked minor/dependent profile. Consent is required,
// mirroring booking.service.ts's assertGuardianConsentIfMinor gate.
export async function isClientProfileAccessibleToUser(
  tx: Prisma.TransactionClient,
  userId: string,
  clientId: string
): Promise<boolean> {
  const ownId = await getOwnClientProfileId(tx, userId);
  if (ownId === clientId) return true;

  const consentedLink = await tx.guardianLink.findFirst({
    where: { guardianUserId: userId, minorClientId: clientId, consentGivenAt: { not: null } },
  });
  return consentedLink !== null;
}
