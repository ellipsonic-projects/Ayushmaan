import { Router, Request, Response } from "express";
import { getTenant } from "../lib/tenant/getTenant";
import { AppError } from "../middleware/errorHandler";
import { supabaseAdmin } from "../lib/supabaseAdmin";

// Unauthenticated tenant site data — powers the public landing page at
// {slug}.<TENANT_ROOT_HOST> (app/(tenant)/[slug]/(public)). Mounted ahead of
// authMiddleware in index.ts; must never return anything beyond branding/
// site-content fields a visitor is meant to see pre-login.
export const publicRouter: Router = Router();

publicRouter.get("/tenants/:slug/site", async (req: Request, res: Response) => {
  const tenant = await getTenant(req.params.slug);
  if (!tenant || tenant.status !== "ACTIVE") {
    throw new AppError(404, "Tenant not found", "TENANT_NOT_FOUND");
  }

  let customLayoutUrl: string | null = null;
  if (tenant.layoutMode === "custom") {
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage
      .from("landing-assets")
      .getPublicUrl(`${tenant.slug}/custom-layout.html`);
    customLayoutUrl = publicUrl;
  }

  res.json({
    data: {
      slug: tenant.slug,
      displayName: tenant.displayName,
      logoUrl: tenant.logoUrl,
      themeConfig: tenant.themeConfig,
      siteContent: tenant.siteContent,
      layoutMode: tenant.layoutMode,
      customLayoutUrl,
    },
  });
});
