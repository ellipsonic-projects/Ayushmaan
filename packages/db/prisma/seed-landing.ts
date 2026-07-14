import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/api/.env") });
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { withTenantContext } from "../src/rls-context";

// Seeding is administrative, not request-serving — runs as the table owner,
// same as seed-tenant.ts (see that file's comment for why).
const adapter = new PrismaPg({
  connectionString: process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const NAVBAR_LINKS = [
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "FAQ", href: "#faq" },
];

const SERVICES = [
  {
    title: "Cataract Surgery",
    description: "Advanced phacoemulsification with premium IOL options.",
  },
  {
    title: "Glaucoma Care",
    description: "Early detection and ongoing management to protect your vision.",
  },
  {
    title: "Retina Treatment",
    description: "Diagnosis and treatment of retinal conditions using modern imaging.",
  },
  {
    title: "Routine Eye Exams",
    description: "Comprehensive vision and eye-health checkups for all ages.",
  },
];

const FAQ_ITEMS = [
  {
    question: "Do I need a referral to book a consultation?",
    answer: "No — you can book directly with any of our consultants through the site.",
  },
  {
    question: "What should I bring to my first visit?",
    answer: "A valid ID, any previous eye reports, and a list of current medications.",
  },
  {
    question: "Do you accept insurance?",
    answer: "We accept most major insurance providers — contact us to confirm your specific plan.",
  },
];

// Populates an existing tenant's public-landing-page content (siteContent +
// themeConfig) — the fields app/(tenant)/[slug]/(public)/page.tsx renders
// via Navbar/HeroSection/AboutSection/ServicesSection/FaqSection/
// ContactFooter. Doesn't create the tenant; run seed-tenant.ts first if it
// doesn't exist yet. Every scalar field has a dummy default so this runs
// with zero env vars; override any of them to seed a different tenant.
// Services/FAQ items aren't env-overridable individually (they're lists) —
// edit SERVICES/FAQ_ITEMS below directly, or configure them afterward via
// the tenant admin Settings > Website page. Run with:
//   pnpm --filter @ayushman/db exec tsx prisma/seed-landing.ts
async function main() {
  const env = (key: string, fallback: string): string => process.env[key] ?? fallback;

  const tenantSlug = env("TENANT_SLUG", "shekhareyehospital");
  const logoUrl = process.env.TENANT_LOGO_URL; // optional — set via the /site/logo upload endpoint instead if you have a real asset

  const primaryColor = env("TENANT_PRIMARY_COLOR", "#0f766e");
  const primaryForeground = env("TENANT_PRIMARY_FOREGROUND", "#ffffff");

  const heroHeading = env("TENANT_HERO_HEADING", "Shekhar Eye Hospital");
  const heroSubheading = env(
    "TENANT_HERO_SUBHEADING",
    "Comprehensive eye care from experienced ophthalmologists — book your consultation today."
  );
  const heroCtaLabel = env("TENANT_HERO_CTA_LABEL", "Book a Consultation");

  const aboutHeading = env("TENANT_ABOUT_HEADING", "About Us");
  const aboutBody = env(
    "TENANT_ABOUT_BODY",
    "Shekhar Eye Hospital has been serving the community with advanced diagnostic and " +
      "surgical eye care for over a decade. Our specialists cover cataract, glaucoma, " +
      "retina, and routine vision care, using modern equipment in a patient-first setting."
  );

  const contactEmail = env("TENANT_CONTACT_EMAIL", "info@shekhareyehospital.com");
  const contactPhone = env("TENANT_CONTACT_PHONE", "+91 98765 43210");
  const contactAddress = env("TENANT_CONTACT_ADDRESS", "12 MG Road, Bengaluru, Karnataka 560001");

  const superAdminCtx = { tenantId: null, isSuperAdmin: true, userId: crypto.randomUUID() };

  const existing = await withTenantContext(
    superAdminCtx,
    (tx) => tx.tenant.findUnique({ where: { slug: tenantSlug } }),
    prisma
  );
  if (!existing) {
    throw new Error(`Tenant "${tenantSlug}" not found — run seed-tenant.ts first.`);
  }

  const updated = await withTenantContext(
    superAdminCtx,
    (tx) =>
      tx.tenant.update({
        where: { slug: tenantSlug },
        data: {
          ...(logoUrl && { logoUrl }),
          themeConfig: { primaryColor, primaryForeground },
          siteContent: {
            navbar: { links: NAVBAR_LINKS },
            hero: { heading: heroHeading, subheading: heroSubheading, ctaLabel: heroCtaLabel },
            about: { heading: aboutHeading, body: aboutBody },
            services: { heading: "Our Services", items: SERVICES },
            faq: { heading: "Frequently Asked Questions", items: FAQ_ITEMS },
            contact: { email: contactEmail, phone: contactPhone, address: contactAddress },
          },
        },
      }),
    prisma
  );

  console.log(`Landing page content seeded for "${updated.slug}" (${updated.id}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
