# Frontend URL Inspection Guide

Instructions for the review team: this is a **frontend-only grading**, so every URL below should be opened in the browser and visually inspected (layout, navigation, empty/placeholder states). All routes are derived from the Next.js App Router structure under `apps/web/app/`. Route groups in parentheses — `(landing)`, `(platform)`, `(tenant)`, `(admin)`, `(client)`, `(consultant)` — do **not** appear in the URL.

> **Note on path segments:** `slug`, `tenant`, `id`, and `consultant_id` are currently _literal_ folder names (static routes), not dynamic `[param]` segments — visit them exactly as written. The only dynamic segment is `[id]` under appointments, marked below; substitute any value (e.g. `1`).

---

## Public / Landing — `app/(landing)/`

| URL        | Source file                  |
| ---------- | ---------------------------- |
| `/`        | `(landing)/page.tsx`         |
| `/billing` | `(landing)/billing/page.tsx` |

---

## Super Admin — `app/(platform)/superadmin/`

### Platform-level pages

| URL                         | Source file                                    |
| --------------------------- | ---------------------------------------------- |
| `/superadmin/dashboard`     | `(platform)/superadmin/dashboard/page.tsx`     |
| `/superadmin/grievances`    | `(platform)/superadmin/grievances/page.tsx`    |
| `/superadmin/microservices` | `(platform)/superadmin/microservices/page.tsx` |
| `/superadmin/notify`        | `(platform)/superadmin/notify/page.tsx`        |
| `/superadmin/notify/create` | `(platform)/superadmin/notify/create/page.tsx` |
| `/superadmin/payments`      | `(platform)/superadmin/payments/page.tsx`      |
| `/superadmin/tenants`       | `(platform)/superadmin/tenants/page.tsx`       |
| `/superadmin/tenants/add`   | `(platform)/superadmin/tenants/add/page.tsx`   |

### Tenant drill-down (Super Admin viewing a tenant workspace)

| URL                                                                                                   | Source file                                                           |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `/superadmin/tenants/id`                                                                              | `(platform)/superadmin/tenants/id/page.tsx`                           |
| `/superadmin/tenants/id/dashboard`                                                                    | `(platform)/superadmin/tenants/id/dashboard/page.tsx`                 |
| `/superadmin/tenants/id/inbox`                                                                        | `(platform)/superadmin/tenants/id/inbox/page.tsx`                     |
| `/superadmin/tenants/id/calendar`                                                                     | `(platform)/superadmin/tenants/id/calendar/page.tsx`                  |
| `/superadmin/tenants/id/scheduler`                                                                    | `(platform)/superadmin/tenants/id/scheduler/page.tsx`                 |
| `/superadmin/tenants/id/scheduler/consultant_id`                                                      | `(platform)/superadmin/tenants/id/scheduler/consultant_id/page.tsx`   |
| `/superadmin/tenants/id/onboarding`                                                                   | `(platform)/superadmin/tenants/id/onboarding/page.tsx`                |
| `/superadmin/tenants/id/consultants`                                                                  | `(platform)/superadmin/tenants/id/consultants/page.tsx`               |
| `/superadmin/tenants/id/consultants/consultant_id`                                                    | `(platform)/superadmin/tenants/id/consultants/consultant_id/page.tsx` |
| `/superadmin/tenants/id/clients`                                                                      | `(platform)/superadmin/tenants/id/clients/page.tsx`                   |
| `/superadmin/tenants/id/sessions`                                                                     | `(platform)/superadmin/tenants/id/sessions/page.tsx`                  |
| `/superadmin/tenants/id/appointments`                                                                 | `(platform)/superadmin/tenants/id/appointments/page.tsx`              |
| `/superadmin/tenants/id/appointments/[id]` _(dynamic — e.g. `/superadmin/tenants/id/appointments/1`)_ | `(platform)/superadmin/tenants/id/appointments/[id]/page.tsx`         |
| `/superadmin/tenants/id/contacts`                                                                     | `(platform)/superadmin/tenants/id/contacts/page.tsx`                  |
| `/superadmin/tenants/id/billing`                                                                      | `(platform)/superadmin/tenants/id/billing/page.tsx`                   |
| `/superadmin/tenants/id/insights`                                                                     | `(platform)/superadmin/tenants/id/insights/page.tsx`                  |
| `/superadmin/tenants/id/templates`                                                                    | `(platform)/superadmin/tenants/id/templates/page.tsx`                 |
| `/superadmin/tenants/id/templates/new`                                                                | `(platform)/superadmin/tenants/id/templates/new/page.tsx`             |
| `/superadmin/tenants/id/workflows`                                                                    | `(platform)/superadmin/tenants/id/workflows/page.tsx`                 |
| `/superadmin/tenants/id/workflows/send`                                                               | `(platform)/superadmin/tenants/id/workflows/send/page.tsx`            |
| `/superadmin/tenants/id/audit-log`                                                                    | `(platform)/superadmin/tenants/id/audit-log/page.tsx`                 |
| `/superadmin/tenants/id/grievance`                                                                    | `(platform)/superadmin/tenants/id/grievance/page.tsx`                 |
| `/superadmin/tenants/id/help`                                                                         | `(platform)/superadmin/tenants/id/help/page.tsx`                      |
| `/superadmin/tenants/id/settings`                                                                     | `(platform)/superadmin/tenants/id/settings/page.tsx`                  |

---

## Tenant Admin — `app/(tenant)/slug/tenant/(admin)/admin/`

| URL                                                                                           | Source file                                                             |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `/slug/tenant/admin/dashboard`                                                                | `(tenant)/slug/tenant/(admin)/admin/dashboard/page.tsx`                 |
| `/slug/tenant/admin/inbox`                                                                    | `(tenant)/slug/tenant/(admin)/admin/inbox/page.tsx`                     |
| `/slug/tenant/admin/calendar`                                                                 | `(tenant)/slug/tenant/(admin)/admin/calendar/page.tsx`                  |
| `/slug/tenant/admin/scheduler`                                                                | `(tenant)/slug/tenant/(admin)/admin/scheduler/page.tsx`                 |
| `/slug/tenant/admin/scheduler/consultant_id`                                                  | `(tenant)/slug/tenant/(admin)/admin/scheduler/consultant_id/page.tsx`   |
| `/slug/tenant/admin/onboarding`                                                               | `(tenant)/slug/tenant/(admin)/admin/onboarding/page.tsx`                |
| `/slug/tenant/admin/consultants`                                                              | `(tenant)/slug/tenant/(admin)/admin/consultants/page.tsx`               |
| `/slug/tenant/admin/consultants/consultant_id`                                                | `(tenant)/slug/tenant/(admin)/admin/consultants/consultant_id/page.tsx` |
| `/slug/tenant/admin/clients`                                                                  | `(tenant)/slug/tenant/(admin)/admin/clients/page.tsx`                   |
| `/slug/tenant/admin/appointments/[id]` _(dynamic — e.g. `/slug/tenant/admin/appointments/1`)_ | `(tenant)/slug/tenant/(admin)/admin/appointments/[id]/page.tsx`         |
| `/slug/tenant/admin/contacts`                                                                 | `(tenant)/slug/tenant/(admin)/admin/contacts/page.tsx`                  |
| `/slug/tenant/admin/billing`                                                                  | `(tenant)/slug/tenant/(admin)/admin/billing/page.tsx`                   |
| `/slug/tenant/admin/insights`                                                                 | `(tenant)/slug/tenant/(admin)/admin/insights/page.tsx`                  |
| `/slug/tenant/admin/templates`                                                                | `(tenant)/slug/tenant/(admin)/admin/templates/page.tsx`                 |
| `/slug/tenant/admin/templates/new`                                                            | `(tenant)/slug/tenant/(admin)/admin/templates/new/page.tsx`             |
| `/slug/tenant/admin/workflows`                                                                | `(tenant)/slug/tenant/(admin)/admin/workflows/page.tsx`                 |
| `/slug/tenant/admin/workflows/send`                                                           | `(tenant)/slug/tenant/(admin)/admin/workflows/send/page.tsx`            |
| `/slug/tenant/admin/audit-log`                                                                | `(tenant)/slug/tenant/(admin)/admin/audit-log/page.tsx`                 |
| `/slug/tenant/admin/grievance`                                                                | `(tenant)/slug/tenant/(admin)/admin/grievance/page.tsx`                 |
| `/slug/tenant/admin/help`                                                                     | `(tenant)/slug/tenant/(admin)/admin/help/page.tsx`                      |
| `/slug/tenant/admin/settings`                                                                 | `(tenant)/slug/tenant/(admin)/admin/settings/page.tsx`                  |

---

## Consultant — `app/(tenant)/slug/tenant/(consultant)/consultant/`

| URL                                      | Source file                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------- |
| `/slug/tenant/consultant/dashboard`      | `(tenant)/slug/tenant/(consultant)/consultant/dashboard/page.tsx`      |
| `/slug/tenant/consultant/inbox`          | `(tenant)/slug/tenant/(consultant)/consultant/inbox/page.tsx`          |
| `/slug/tenant/consultant/calendar`       | `(tenant)/slug/tenant/(consultant)/consultant/calendar/page.tsx`       |
| `/slug/tenant/consultant/sessions`       | `(tenant)/slug/tenant/(consultant)/consultant/sessions/page.tsx`       |
| `/slug/tenant/consultant/clients`        | `(tenant)/slug/tenant/(consultant)/consultant/clients/page.tsx`        |
| `/slug/tenant/consultant/team`           | `(tenant)/slug/tenant/(consultant)/consultant/team/page.tsx`           |
| `/slug/tenant/consultant/billing`        | `(tenant)/slug/tenant/(consultant)/consultant/billing/page.tsx`        |
| `/slug/tenant/consultant/templates`      | `(tenant)/slug/tenant/(consultant)/consultant/templates/page.tsx`      |
| `/slug/tenant/consultant/templates/new`  | `(tenant)/slug/tenant/(consultant)/consultant/templates/new/page.tsx`  |
| `/slug/tenant/consultant/workflows`      | `(tenant)/slug/tenant/(consultant)/consultant/workflows/page.tsx`      |
| `/slug/tenant/consultant/workflows/send` | `(tenant)/slug/tenant/(consultant)/consultant/workflows/send/page.tsx` |
| `/slug/tenant/consultant/settings`       | `(tenant)/slug/tenant/(consultant)/consultant/settings/page.tsx`       |

---

## Client — `app/(tenant)/slug/tenant/(client)/client/`

| URL                                 | Source file                                                   |
| ----------------------------------- | ------------------------------------------------------------- |
| `/slug/tenant/client/dashboard`     | `(tenant)/slug/tenant/(client)/client/dashboard/page.tsx`     |
| `/slug/tenant/client/inbox`         | `(tenant)/slug/tenant/(client)/client/inbox/page.tsx`         |
| `/slug/tenant/client/relationships` | `(tenant)/slug/tenant/(client)/client/relationships/page.tsx` |
| `/slug/tenant/client/documentation` | `(tenant)/slug/tenant/(client)/client/documentation/page.tsx` |
| `/slug/tenant/client/settings`      | `(tenant)/slug/tenant/(client)/client/settings/page.tsx`      |

---

## Summary

| Group            | Page count |
| ---------------- | ---------- |
| Public / Landing | 2          |
| Super Admin      | 32         |
| Tenant Admin     | 21         |
| Consultant       | 12         |
| Client           | 5          |
| **Total**        | **72**     |

### Known placeholder links (from prior review)

- `app/(landing)/page.tsx:405` — "Discover more" button links to `#`
- `components/tenant/shared/inbox/connect-inbox-dialog.tsx:116` — "Guide to set up inbox account" links to `#`
