import { Router, Response, NextFunction } from "express";
import multer from "multer";
import DOMPurify from "isomorphic-dompurify";
import { z } from "zod";
import type { Prisma } from "@ayushman/db";
import { withTenantContext } from "@ayushman/db/rls-context";
import { supabaseAdmin } from "../lib/supabaseAdmin";
import { AuthenticatedRequest } from "../middleware/auth";
import { TenantScopedRequest } from "../middleware/tenant-context";
import { requireRole } from "../middleware/require-role";
import { requireTenantMatch } from "../middleware/require-tenant-match";
import { AppError } from "../middleware/errorHandler";
import { writeAuditLog } from "../services/audit.service";

// data_api_v4.md §4 — Platform Console (tenants, tenant_billing). Every route
// here is SUPER_ADMIN-only, global scope; no tenant-context match applies —
// reaching into any given tenant IS the point, and is audit-logged instead.
export const platformTenantsRouter: Router = Router();
platformTenantsRouter.use(requireRole("SUPER_ADMIN"));

const createTenantSchema = z
  .object({
    slug: z
      .string()
      .min(2)
      .max(63)
      .regex(/^[a-z0-9-]+$/, "slug must be lowercase alphanumeric/hyphens"),
    displayName: z.string().min(1).max(200),
    adminEmail: z.string().email(),
    planTier: z.enum(["STANDARD", "PRO", "ENTERPRISE"]).default("STANDARD"),
  })
  .strict();

// Starter copy for a tenant's public landing page — editable afterward via
// PATCH .../site (tenant admin) or PATCH /platform/tenants/:id (super admin).
function defaultSiteContent(displayName: string) {
  return {
    navbar: {
      links: [
        { label: "About", href: "#about" },
        { label: "Services", href: "#services" },
        { label: "FAQ", href: "#faq" },
      ],
    },
    hero: {
      heading: `Welcome to ${displayName}`,
      subheading: "Book a consultation with our team of experts.",
      ctaLabel: "Get Started",
    },
    about: {
      heading: "About Us",
      body: "",
    },
    services: {
      heading: "Services",
      items: [] as { title: string; description: string }[],
    },
    faq: {
      heading: "Frequently Asked Questions",
      items: [] as { question: string; answer: string }[],
    },
    contact: {
      email: "",
      phone: "",
      address: "",
    },
  };
}

// POST /platform/tenants — provisions the tenant + tenant_settings +
// tenant_billing + a default TENANT_ADMIN user, in one transaction
// (sprints_v3.md Sprint 1.1).
platformTenantsRouter.post("/", async (req: AuthenticatedRequest, res: Response) => {
  const body = createTenantSchema.parse(req.body);

  const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    body.adminEmail
  );
  if (inviteError || !invited.user) {
    throw new AppError(
      502,
      `Failed to invite tenant admin: ${inviteError?.message ?? "unknown error"}`,
      "INVITE_FAILED"
    );
  }

  const tenant = await withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
    (tx) =>
      tx.tenant.create({
        data: {
          slug: body.slug,
          displayName: body.displayName,
          planTier: body.planTier,
          provisionedBy: req.user!.id,
          siteContent: defaultSiteContent(body.displayName),
          settings: { create: {} },
          billing: { create: { planName: body.planTier } },
          users: {
            create: {
              supabaseAuthUserId: invited.user!.id,
              role: "TENANT_ADMIN",
              email: body.adminEmail,
            },
          },
        },
        include: { settings: true, billing: true, users: true },
      })
  );

  res.status(201).json({ data: tenant });
});

const listTenantsQuerySchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "ARCHIVED"]).optional(),
  planTier: z.string().optional(),
  search: z.string().optional(),
});

// GET /platform/tenants — list/search. Global list, no per-tenant filter.
platformTenantsRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const query = listTenantsQuerySchema.parse(req.query);

  const tenants = await withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
    (tx) =>
      tx.tenant.findMany({
        where: {
          status: query.status,
          planTier: query.planTier,
          ...(query.search && {
            OR: [
              { slug: { contains: query.search, mode: "insensitive" } },
              { displayName: { contains: query.search, mode: "insensitive" } },
            ],
          }),
        },
        orderBy: { createdAt: "desc" },
      })
  );

  res.json({ data: tenants });
});

// GET /platform/tenants/:tenantId — single-tenant deep view. Reading this is
// itself a cross-tenant read for the platform account, so it's audit-logged
// per data_api_v4.md §4/§1.2 ("reason required for anything beyond the
// tenant list/billing dashboard").
platformTenantsRouter.get("/:tenantId", async (req: AuthenticatedRequest, res: Response) => {
  const reason = typeof req.query.reason === "string" ? req.query.reason : undefined;
  if (!reason) {
    throw new AppError(
      400,
      "A `reason` query param is required to view a tenant's deep view",
      "REASON_REQUIRED"
    );
  }

  const tenant = await withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
    async (tx) => {
      const found = await tx.tenant.findUnique({
        where: { id: req.params.tenantId },
        include: { settings: true, billing: true, users: true },
      });
      if (found) {
        await writeAuditLog(tx, {
          tenantId: found.id,
          actorUserId: req.user!.id,
          actorRole: req.user!.role as any,
          isCrossTenantAccess: true,
          action: "VIEW_TENANT_DEEP_VIEW",
          entityType: "tenants",
          entityId: found.id,
          reason,
        });
      }
      return found;
    }
  );

  if (!tenant) throw new AppError(404, "Tenant not found", "TENANT_NOT_FOUND");
  res.json({ data: tenant });
});

const patchTenantSchema = z
  .object({
    displayName: z.string().min(1).max(200).optional(),
    logoUrl: z.string().url().optional(),
    themeConfig: z.record(z.string(), z.unknown()).optional(),
    planTier: z.enum(["STANDARD", "PRO", "ENTERPRISE"]).optional(),
    reason: z.string().min(1),
  })
  .strict();

// PATCH /platform/tenants/:tenantId — cross-tenant write, audit-logged;
// `reason` is mandatory in the body (data_api_v4.md §4).
platformTenantsRouter.patch("/:tenantId", async (req: AuthenticatedRequest, res: Response) => {
  const { reason, ...updates } = patchTenantSchema.parse(req.body);

  const tenant = await withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
    async (tx) => {
      const updated = await tx.tenant.update({
        where: { id: req.params.tenantId },
        data: updates as Prisma.TenantUpdateInput,
      });
      await writeAuditLog(tx, {
        tenantId: updated.id,
        actorUserId: req.user!.id,
        actorRole: req.user!.role as any,
        isCrossTenantAccess: true,
        action: "UPDATE_TENANT",
        entityType: "tenants",
        entityId: updated.id,
        reason,
      });
      return updated;
    }
  );

  res.json({ data: tenant });
});

async function setTenantStatus(
  req: AuthenticatedRequest,
  res: Response,
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED",
  action: string
) {
  const tenant = await withTenantContext(
    { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
    async (tx) => {
      const updated = await tx.tenant.update({
        where: { id: req.params.tenantId },
        data: { status },
      });
      await writeAuditLog(tx, {
        tenantId: updated.id,
        actorUserId: req.user!.id,
        actorRole: req.user!.role as any,
        isCrossTenantAccess: true,
        action,
        entityType: "tenants",
        entityId: updated.id,
      });
      return updated;
    }
  );
  res.json({ data: tenant });
}

// POST /platform/tenants/:tenantId/suspend
platformTenantsRouter.post("/:tenantId/suspend", (req: AuthenticatedRequest, res: Response) =>
  setTenantStatus(req, res, "SUSPENDED", "SUSPEND_TENANT")
);

// POST /platform/tenants/:tenantId/reinstate
platformTenantsRouter.post("/:tenantId/reinstate", (req: AuthenticatedRequest, res: Response) =>
  setTenantStatus(req, res, "ACTIVE", "REINSTATE_TENANT")
);

// DELETE /platform/tenants/:tenantId — never a hard delete; archives per the
// indefinite-retention rule (schema_ayushman_v3.md §5).
platformTenantsRouter.delete("/:tenantId", (req: AuthenticatedRequest, res: Response) =>
  setTenantStatus(req, res, "ARCHIVED", "ARCHIVE_TENANT")
);

// GET /platform/tenants/:tenantId/billing, PATCH .../billing
platformTenantsRouter.get(
  "/:tenantId/billing",
  async (req: AuthenticatedRequest, res: Response) => {
    const billing = await withTenantContext(
      { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
      async (tx) => {
        const found = await tx.tenantBilling.findUnique({
          where: { tenantId: req.params.tenantId },
        });
        if (found) {
          await writeAuditLog(tx, {
            tenantId: req.params.tenantId,
            actorUserId: req.user!.id,
            actorRole: req.user!.role as any,
            isCrossTenantAccess: true,
            action: "VIEW_TENANT_BILLING",
            entityType: "tenant_billing",
            entityId: req.params.tenantId,
          });
        }
        return found;
      }
    );
    if (!billing) throw new AppError(404, "Billing record not found", "TENANT_BILLING_NOT_FOUND");
    res.json({ data: billing });
  }
);

const patchBillingSchema = z
  .object({
    planName: z.string().min(1).max(100).optional(),
    status: z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "CANCELLED"]).optional(),
    platformCommissionPct: z.number().min(0).max(100).optional(),
  })
  .strict();

platformTenantsRouter.patch(
  "/:tenantId/billing",
  async (req: AuthenticatedRequest, res: Response) => {
    const updates = patchBillingSchema.parse(req.body);

    const billing = await withTenantContext(
      { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
      async (tx) => {
        const updated = await tx.tenantBilling.update({
          where: { tenantId: req.params.tenantId },
          data: updates,
        });
        await writeAuditLog(tx, {
          tenantId: req.params.tenantId,
          actorUserId: req.user!.id,
          actorRole: req.user!.role as any,
          isCrossTenantAccess: true,
          action: "UPDATE_TENANT_BILLING",
          entityType: "tenant_billing",
          entityId: req.params.tenantId,
        });
        return updated;
      }
    );

    res.json({ data: billing });
  }
);

// POST/DELETE /platform/tenants/:tenantId/custom-layout — SUPER_ADMIN-only
// upload of a fully custom, hand-built landing page for a tenant. Only the
// super admin can reach this route (platformTenantsRouter.use(requireRole
// ("SUPER_ADMIN")) above), so the uploaded HTML is trusted-author content,
// not tenant/user-supplied — sanitizing anyway (DOMPurify strips <script>,
// inline event handlers, javascript: URLs) is defense-in-depth, not the
// primary control. Stored as a single static file in the existing
// `landing-assets` bucket, replacing the default component-based layout.
const customLayoutUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "text/html") {
      return cb(new AppError(400, "Custom layout must be an HTML file", "INVALID_FILE_TYPE"));
    }
    cb(null, true);
  },
});

function handleCustomLayoutUpload(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  customLayoutUpload.single("file")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      return next(new AppError(400, err.message, "INVALID_UPLOAD"));
    }
    if (err) return next(err);
    next();
  });
}

platformTenantsRouter.post(
  "/:tenantId/custom-layout",
  handleCustomLayoutUpload,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) throw new AppError(400, "No file uploaded", "FILE_REQUIRED");

    const tenant = await withTenantContext(
      { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
      (tx) => tx.tenant.findUnique({ where: { id: req.params.tenantId } })
    );
    if (!tenant) throw new AppError(404, "Tenant not found", "TENANT_NOT_FOUND");

    const clean = DOMPurify.sanitize(req.file.buffer.toString("utf-8"));
    const path = `${tenant.slug}/custom-layout.html`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("landing-assets")
      .upload(path, clean, { contentType: "text/html", upsert: true });
    if (uploadError) {
      throw new AppError(502, `Failed to upload layout: ${uploadError.message}`, "UPLOAD_FAILED");
    }

    const updated = await withTenantContext(
      { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
      async (tx) => {
        const result = await tx.tenant.update({
          where: { id: req.params.tenantId },
          data: { layoutMode: "custom", customLayoutRequested: false },
        });
        await writeAuditLog(tx, {
          tenantId: result.id,
          actorUserId: req.user!.id,
          actorRole: req.user!.role as any,
          isCrossTenantAccess: true,
          action: "UPLOAD_CUSTOM_LAYOUT",
          entityType: "tenants",
          entityId: result.id,
        });
        return result;
      }
    );

    res.json({ data: updated });
  }
);

platformTenantsRouter.delete(
  "/:tenantId/custom-layout",
  async (req: AuthenticatedRequest, res: Response) => {
    const tenant = await withTenantContext(
      { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
      (tx) => tx.tenant.findUnique({ where: { id: req.params.tenantId } })
    );
    if (!tenant) throw new AppError(404, "Tenant not found", "TENANT_NOT_FOUND");

    await supabaseAdmin.storage
      .from("landing-assets")
      .remove([`${tenant.slug}/custom-layout.html`]);

    const updated = await withTenantContext(
      { tenantId: null, isSuperAdmin: true, userId: req.user!.id },
      async (tx) => {
        const result = await tx.tenant.update({
          where: { id: req.params.tenantId },
          data: { layoutMode: "default" },
        });
        await writeAuditLog(tx, {
          tenantId: result.id,
          actorUserId: req.user!.id,
          actorRole: req.user!.role as any,
          isCrossTenantAccess: true,
          action: "REMOVE_CUSTOM_LAYOUT",
          entityType: "tenants",
          entityId: result.id,
        });
        return result;
      }
    );

    res.json({ data: updated });
  }
);

// data_api_v4.md §5 — a tenant's own settings/billing view (TENANT_ADMIN, own
// tenant only; SUPER_ADMIN also allowed but that's a cross-tenant read
// covered by the platform routes above, not duplicated here).
export const tenantSettingsRouter: Router = Router({ mergeParams: true });
tenantSettingsRouter.use(requireRole("TENANT_ADMIN", "SUPER_ADMIN"), requireTenantMatch);

tenantSettingsRouter.get("/settings", async (req: TenantScopedRequest, res: Response) => {
  const settings = await withTenantContext(req.tenantContext!, (tx) =>
    tx.tenantSettings.findUnique({ where: { tenantId: req.params.tenantId } })
  );
  if (!settings) throw new AppError(404, "Tenant settings not found", "TENANT_SETTINGS_NOT_FOUND");
  res.json({ data: settings });
});

const patchSettingsSchema = z
  .object({
    defaultCurrency: z.string().length(3).optional(),
    payoutCycle: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
    bookingCutoffHours: z.number().int().min(0).optional(),
    autoApproveBookings: z.boolean().optional(),
    supportedLanguages: z.array(z.string()).optional(),
  })
  .strict();

tenantSettingsRouter.patch("/settings", async (req: TenantScopedRequest, res: Response) => {
  const updates = patchSettingsSchema.parse(req.body);
  const settings = await withTenantContext(req.tenantContext!, (tx) =>
    tx.tenantSettings.update({ where: { tenantId: req.params.tenantId }, data: updates })
  );
  res.json({ data: settings });
});

const patchSiteSchema = z
  .object({
    displayName: z.string().min(1).max(200).optional(),
    logoUrl: z.string().url().optional(),
    themeConfig: z.record(z.string(), z.unknown()).optional(),
    siteContent: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

// GET/PATCH /site — Tenant Admin's own-tenant self-serve public-website
// customization (branding + landing-page content). Same fields the
// SUPER_ADMIN platform route above can touch, but scoped to the caller's own
// tenant and without the audit-log/reason requirement that cross-tenant
// writes need.
tenantSettingsRouter.get("/site", async (req: TenantScopedRequest, res: Response) => {
  const tenant = await withTenantContext(req.tenantContext!, (tx) =>
    tx.tenant.findUnique({
      where: { id: req.params.tenantId },
      select: {
        displayName: true,
        logoUrl: true,
        themeConfig: true,
        siteContent: true,
        layoutMode: true,
        customLayoutRequested: true,
      },
    })
  );
  if (!tenant) throw new AppError(404, "Tenant not found", "TENANT_NOT_FOUND");
  res.json({ data: tenant });
});

tenantSettingsRouter.patch("/site", async (req: TenantScopedRequest, res: Response) => {
  const updates = patchSiteSchema.parse(req.body);
  const tenant = await withTenantContext(req.tenantContext!, (tx) =>
    tx.tenant.update({
      where: { id: req.params.tenantId },
      data: updates as Prisma.TenantUpdateInput,
      select: {
        displayName: true,
        logoUrl: true,
        themeConfig: true,
        siteContent: true,
        layoutMode: true,
        customLayoutRequested: true,
      },
    })
  );
  res.json({ data: tenant });
});

// POST /site/logo — uploads to the public `landing-assets` Supabase Storage
// bucket at "{slug}/logo-{timestamp}.{ext}" (supabase/storage-policies/
// landing-assets.sql) and persists the resulting public object URL as the
// tenant's logoUrl. Uploads go through this service-role client, never a
// bucket credential handed to the browser.
const LOGO_EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!(file.mimetype in LOGO_EXT_BY_MIME)) {
      return cb(new AppError(400, "Logo must be PNG, JPEG, SVG, or WebP", "INVALID_FILE_TYPE"));
    }
    cb(null, true);
  },
});

function handleLogoUpload(req: TenantScopedRequest, res: Response, next: NextFunction) {
  logoUpload.single("file")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      return next(new AppError(400, err.message, "INVALID_UPLOAD"));
    }
    if (err) return next(err);
    next();
  });
}

tenantSettingsRouter.post(
  "/site/logo",
  handleLogoUpload,
  async (req: TenantScopedRequest, res: Response) => {
    if (!req.file) throw new AppError(400, "No file uploaded", "FILE_REQUIRED");

    const path = `${req.tenant!.slug}/logo-${Date.now()}.${LOGO_EXT_BY_MIME[req.file.mimetype]}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("landing-assets")
      .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
    if (uploadError) {
      throw new AppError(502, `Failed to upload logo: ${uploadError.message}`, "UPLOAD_FAILED");
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("landing-assets").getPublicUrl(path);

    const tenant = await withTenantContext(req.tenantContext!, (tx) =>
      tx.tenant.update({
        where: { id: req.params.tenantId },
        data: { logoUrl: publicUrl },
        select: {
          displayName: true,
          logoUrl: true,
          themeConfig: true,
          siteContent: true,
          layoutMode: true,
          customLayoutRequested: true,
        },
      })
    );

    res.json({ data: tenant });
  }
);

// PATCH /site/custom-layout-request — tenant admin toggles a "please build me
// a custom layout" flag; the super admin sees it and follows up by uploading
// a layout via POST /platform/tenants/:id/custom-layout (which clears it).
tenantSettingsRouter.patch(
  "/site/custom-layout-request",
  async (req: TenantScopedRequest, res: Response) => {
    const { requested } = z.object({ requested: z.boolean() }).strict().parse(req.body);
    const tenant = await withTenantContext(req.tenantContext!, (tx) =>
      tx.tenant.update({
        where: { id: req.params.tenantId },
        data: { customLayoutRequested: requested },
        select: {
          displayName: true,
          logoUrl: true,
          themeConfig: true,
          siteContent: true,
          layoutMode: true,
          customLayoutRequested: true,
        },
      })
    );
    res.json({ data: tenant });
  }
);

// Tenant Admin's own subscription view — deliberately omits any
// platform-internal figures (data_api_v4.md §5's `mrr` note; this schema's
// TenantBilling has no such field, so the whole row is safe to return as-is).
tenantSettingsRouter.get(
  "/billing",
  requireRole("TENANT_ADMIN"),
  async (req: TenantScopedRequest, res: Response) => {
    const billing = await withTenantContext(req.tenantContext!, (tx) =>
      tx.tenantBilling.findUnique({
        where: { tenantId: req.params.tenantId },
        select: { planName: true, status: true, updatedAt: true },
      })
    );
    if (!billing) throw new AppError(404, "Billing record not found", "TENANT_BILLING_NOT_FOUND");
    res.json({ data: billing });
  }
);
