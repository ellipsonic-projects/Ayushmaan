// Cross-app, type-only shared shapes. apps/web must stay Prisma-free (PRD
// §7.2) — this package is where a type that both apps/web and apps/api need
// lives, as a plain literal/interface, never as a re-export of a Prisma
// model. Keep these in sync with packages/db/prisma/schema.prisma by hand;
// nothing here should ever `import` from @ayushman/db.

export type UserRole = "SUPER_ADMIN" | "TENANT_ADMIN" | "CONSULTANT" | "CLIENT";

export type ConsultantCategory =
  "MEDICAL" | "LEGAL" | "IT" | "PHYSIOTHERAPY" | "HOMEOPATHY" | "ASTROLOGY";
