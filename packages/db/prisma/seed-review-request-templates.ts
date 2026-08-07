import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../apps/api/.env") });
import { Prisma, PrismaClient, TemplateChannel } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { withTenantContext } from "../src/rls-context";

// Seeding is administrative, not request-serving — it must run as the table
// owner (postgres), never as the RLS-restricted app_user. See seed-tenant.ts
// for the full rationale.
const adapter = new PrismaPg({
  connectionString: process.env.MIGRATE_DATABASE_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

// --- Tiptap JSON builders (see apps/web's template-editor.tsx for the
// Mention extension config and apps/api's template-render.service.ts for the
// node types these have to match) -------------------------------------------

type Node = Record<string, unknown>;

function text(value: string, bold = false): Node {
  return bold
    ? { type: "text", text: value, marks: [{ type: "bold" }] }
    : { type: "text", text: value };
}

// `id` must be one of apps/web's lib/constants/merge-fields.ts MERGE_FIELDS
// entries — that's the only vocabulary template-render.service.ts's
// resolvePath(context, id) understands at send time.
function mention(id: string, label: string): Node {
  return { type: "mention", attrs: { id, label } };
}

function paragraph(...content: Node[]): Node {
  return { type: "paragraph", content };
}

function heading(level: number, ...content: Node[]): Node {
  return { type: "heading", attrs: { level }, content };
}

function bulletList(...items: Node[][]): Node {
  return {
    type: "bulletList",
    content: items.map((content) => ({ type: "listItem", content: [paragraph(...content)] })),
  };
}

function doc(...content: Node[]): Node {
  return { type: "doc", content };
}

// --- Template content --------------------------------------------------
// The original draft linked to a review-submission URL keyed by
// appointment.id, but neither a review-submission route nor an
// `appointment.id` merge field exist yet (lib/constants/merge-fields.ts only
// exposes client/appointment/consultant fields used below) — so these ask
// the client to reply instead of following a link. Swap that instruction out
// once a real review link exists.

const emailContent = doc(
  paragraph(text("Dear "), mention("client.name", "Client name"), text(",")),
  paragraph(
    text("Thank you for attending your appointment on "),
    mention("appointment.date", "Appointment date"),
    text(" at "),
    mention("appointment.time", "Appointment time"),
    text(" with "),
    mention("consultant.name", "Consultant name"),
    text(".")
  ),
  paragraph(
    text("We'd appreciate it if you could take a minute to share your feedback on the session:")
  ),
  heading(3, text("Appointment Review")),
  bulletList(
    [text("Rating (1 to 5 stars) — required")],
    [text("Recommendation score (0 to 10) — optional")],
    [text("Comments — optional")]
  ),
  paragraph(text("Please reply to this email with your rating, score, and any comments.")),
  paragraph(text("Best regards,")),
  paragraph(mention("consultant.name", "Consultant name")),
  paragraph(
    text("Contact: "),
    mention("consultant.email", "Consultant email"),
    text(" | "),
    mention("consultant.phone", "Consultant phone")
  )
);

const templates: {
  name: string;
  channel: TemplateChannel;
  subject?: string;
  content: Node;
}[] = [
  {
    name: "Client Post-Appointment Review Form Request (Email)",
    channel: "EMAIL",
    subject: "Share your feedback on your consultation",
    content: emailContent,
  },
];

// Publishes the review-request message template with COMMUNITY scope so
// every consultant on the platform can use it.
// workflow_templates always belongs to a real tenant + consultant (schema
// §5.5.1) — even a COMMUNITY row — so this attaches to one existing
// consultant (CONSULTANT_EMAIL env var, else the first consultant found) and
// inserts already APPROVED, standing in for the Super Admin moderation step
// a real submission would otherwise wait on. Run with:
//   pnpm --filter @ayushman/db exec tsx prisma/seed-review-request-templates.ts
async function main() {
  const consultantEmail = process.env.CONSULTANT_EMAIL;

  const consultant = await prisma.consultantProfile.findFirst({
    where: consultantEmail ? { user: { email: consultantEmail } } : undefined,
    include: { user: { select: { id: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (!consultant) {
    throw new Error(
      consultantEmail
        ? `No consultant found for CONSULTANT_EMAIL="${consultantEmail}".`
        : "No consultant found — run seed-consultants.ts first, or set CONSULTANT_EMAIL."
    );
  }

  const ctx = {
    tenantId: consultant.tenantId,
    isSuperAdmin: false,
    userId: consultant.user.id,
    consultantId: consultant.id,
  };

  for (const template of templates) {
    const existing = await withTenantContext(
      ctx,
      (tx) =>
        tx.workflowTemplate.findFirst({
          where: { consultantId: consultant.id, name: template.name, deletedAt: null },
        }),
      prisma
    );
    if (existing) {
      console.log(`Skipping "${template.name}" — already exists.`);
      continue;
    }

    await withTenantContext(
      ctx,
      (tx) =>
        tx.workflowTemplate.create({
          data: {
            tenantId: consultant.tenantId,
            consultantId: consultant.id,
            scope: "COMMUNITY",
            status: "APPROVED",
            channel: template.channel,
            name: template.name,
            subject: template.subject,
            content: template.content as Prisma.InputJsonValue,
          },
        }),
      prisma
    );
    console.log(`Created "${template.name}" (${template.channel}).`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
