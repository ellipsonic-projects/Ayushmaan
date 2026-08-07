import type { TourStep } from "../types";

export const superadminTourSteps: TourStep[] = [
  {
    target: '[data-tour="superadmin-sidebar"]',
    route: "/dashboard",
    title: "Welcome, Super Admin",
    content:
      "Your platform command center — manage every tenant, monitor health, and control what's shared across the whole product.",
    placement: "right",
  },
  {
    target: '[data-tour="superadmin-stats-grid"]',
    route: "/dashboard",
    title: "Platform at a Glance",
    content:
      "Tenant counts, activity, and growth — the numbers that matter across the whole platform.",
    placement: "bottom",
  },
  {
    target: '[data-tour="superadmin-nav-tenants"]',
    route: "/tenants",
    title: "Tenant Directory",
    content:
      "Every practice on the platform. Search, filter, and drill into any tenant's cases, clients, consultants, and workflows.",
    placement: "right",
  },
  {
    target: '[data-tour="superadmin-nav-templates"]',
    route: "/templates",
    title: "Community Templates",
    content: "Platform-wide message and form templates available to all tenants.",
    placement: "right",
  },
  {
    target: '[data-tour="superadmin-templates-board"]',
    route: "/templates",
    title: "Create & Manage",
    content:
      "Create new community templates or edit existing ones. These appear in every tenant's template library.",
    placement: "top",
  },
  {
    target: '[data-tour="superadmin-nav-community-templates"]',
    route: "/community-templates",
    title: "Template Moderation",
    content: "Review templates submitted by tenant admins. Approve or reject with feedback.",
    placement: "right",
  },
  {
    target: '[data-tour="superadmin-nav-workflows"]',
    route: "/workflows",
    title: "Community Workflows",
    content: "Platform-wide automation workflows. Manage and deploy across all tenants.",
    placement: "right",
  },
];
