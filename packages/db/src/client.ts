import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var __ayushmanPrisma: PrismaClient | undefined;
}

// Prisma 7 requires a driver adapter for PrismaClient — schema.prisma no
// longer carries a connection url (see packages/db/prisma.config.ts for Migrate).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Reused across dev-server reloads (tsx watch / next dev) to avoid exhausting
// DB connections. This is the only PrismaClient instance any app should
// construct — apps/api (and any future service) must import `prisma` from
// here rather than `new PrismaClient()` directly.
export const prisma = global.__ayushmanPrisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  global.__ayushmanPrisma = prisma;
}

export * from "@prisma/client";
