# In-App Interactive Tour

Step-by-step walkthrough tours for each role: Client, Consultant, Tenant Admin, and Super Admin.

## Overview

- **Auto-start:** Tour starts on first sign-in per role (1s delay after page render)
- **Manual start:** "Take a Tour" / "Retake Tour" button in each sidebar's bottom section
- **Navigation:** Manual — tour pauses with "Navigate to X" prompt, resumes on route change
- **Persistence:** `localStorage` key `ayushman-tour-completed` stores completed role names
- **Mobile:** Tour hidden on screens below `lg` (1024px)
- **Status:** Fully implemented for all 4 roles. Every page in each role's app now has at least one tour touchpoint, except a small set of explicitly-excluded pages (see "Excluded Pages" per role below).

---

## Files

```
components/tour/
  types.ts                 # TourStep interface
  tour-store.ts             # Zustand store (activeStep, isActive, completedRoles, start/next/prev/skip/complete)
  tour-provider.tsx         # Context provider wrapping role layouts, route listener for pause/resume
  tour-overlay.tsx          # Fixed backdrop with spotlight cutout around target element
  tour-tooltip.tsx          # Positioned card: title, description, step counter, navigation buttons
  tour-trigger.tsx          # "Take a Tour" / "Retake Tour" button for sidebar bottom sections
  steps/
    client-tour.ts          # 16 steps
    consultant-tour.ts      # 30 steps
    admin-tour.ts            # 27 steps
    superadmin-tour.ts       # 7 steps
```

```
# Layouts — wrapped with <TourProvider>
app/(platform)/(client)/client/layout.tsx
app/(tenant)/[slug]/tenant/(consultant)/consultant/layout.tsx
app/(tenant)/[slug]/tenant/(admin)/admin/layout.tsx
app/(platform)/(superadmin)/superadmin/layout.tsx

# Sidebars — <TourTrigger> in bottom section
components/tenant/client/sidebar.tsx
components/tenant/consultant/sidebar.tsx
components/tenant/admin/sidebar.tsx (nav items in components/tenant/admin/nav.tsx)
components/platform/sidebar.tsx (nav items in components/platform-nav.tsx)
```

---

## Step Definition Shape

```ts
interface TourStep {
  target: string; // CSS selector for the element to spotlight
  title: string; // Bold heading
  content: string; // Description text
  placement?: "top" | "bottom" | "left" | "right";
  route?: string; // If set, tour pauses and shows "Navigate to X" until route matches
}
```

---

## Tour Start Logic

### Auto-start on first sign-in

`TourProvider` checks `localStorage` on mount. If the current role is not in `completedRoles[]`, it calls `start()` after a 1-second delay (lets the page render first).

```ts
// In TourProvider useEffect
const { completedRoles, start } = useTourStore();
const role = useRole(); // "client" | "consultant" | "admin" | "superadmin"

useEffect(() => {
  if (!completedRoles.includes(role)) {
    const timer = setTimeout(() => start(), 1000);
    return () => clearTimeout(timer);
  }
}, []);
```

### Button click

`TourTrigger` button in each sidebar's bottom section (between primary CTA and user profile row).

- If not completed: shows "Take a Tour"
- If completed: shows "Retake Tour" (resets that role's completion status before starting)

---

## Client Tour (16 steps)

Entry point: `<TourTrigger />` in `ClientSidebar` bottom section.

| #   | Target                                   | Route                | Title                      | Content                                                                                                                |
| --- | ---------------------------------------- | -------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | `[data-tour="client-sidebar"]`           | `/dashboard`         | **Welcome to Ayushman**    | "This is your personal dashboard. See upcoming appointments, completed sessions, and shared documents at a glance."    |
| 2   | `[data-tour="client-stats"]`             | `/dashboard`         | **Your Activity**          | "Three cards show your upcoming appointments, completed sessions, and documents shared with you. Tap any for details." |
| 3   | `[data-tour="client-appointments-tab"]`  | `/dashboard`         | **Appointment History**    | "Switch between Upcoming and Past. Each card shows your consultant, date/time, and session status."                    |
| 4   | `[data-tour="client-book-cta"]`          | `/dashboard`         | **Book an Appointment**    | "Pick a consultant, choose a time slot, and confirm. This is how you start or continue a case."                        |
| 5   | `[data-tour="client-nav-relationships"]` | `/relationships`     | **Your Consultants**       | "See every consultant you've worked with. View case timelines, send messages, and book follow-ups."                    |
| 6   | `[data-tour="client-nav-tasks"]`         | `/tasks`             | **Your Tasks**             | "Tasks assigned by your consultant, organized by case. Complete them to keep your case moving forward."                |
| 7   | `[data-tour="client-nav-docs"]`          | `/documentation`     | **Documentation**          | "Documents, form submissions, and shared materials — all organized by case."                                           |
| 8   | `[data-tour="client-nav-notifications"]` | `/notifications`     | **Notifications**          | "Choose how you get reminders — email, SMS, or WhatsApp. Appointment reminders, task alerts, and session join links."  |
| 9   | `[data-tour="client-nav-appointments"]`  | `/appointments`      | **Appointments**           | "Every session across your cases, sorted into needing your response, upcoming, and past."                              |
| 10  | `[data-tour="client-appointments-list"]` | `/appointments`      | **Respond & Manage**       | "Accept or decline reschedule proposals here, and cancel upcoming sessions if plans change."                           |
| 11  | `[data-tour="client-nav-book"]`          | `/appointments/book` | **Book a New Appointment** | "Jump straight into booking — pick a field, consultant, and time slot in a few steps."                                 |
| 12  | `[data-tour="client-book-flow-steps"]`   | `/appointments/book` | **Follow the Steps**       | "Field, Consultant, Requirements, Slot, Confirm — track your progress here as you move through the flow."              |
| 13  | `[data-tour="client-nav-documents"]`     | `/documents`         | **My Documents**           | "Upload, download, and manage documents for each of your cases."                                                       |
| 14  | `[data-tour="client-nav-inbox"]`         | `/inbox`             | **Inbox**                  | "Connect your email to message consultants directly, or use chat — everything in one place."                           |
| 15  | `[data-tour="client-nav-settings"]`      | `/settings`          | **Profile & Settings**     | "Update your profile details, or apply to become a consultant on the platform."                                        |
| 16  | `[data-tour="client-become-consultant"]` | `/settings`          | **Become a Consultant**    | "Apply directly, or use an invite code from a practice to join as a consultant."                                       |

**Note:** the Notifications data-tour key was renamed from `client-nav-settings` to `client-nav-notifications` (it was previously mislabeled and pointed at Notifications, not the real Settings page) to free up `client-nav-settings` for step 15.

**Excluded pages:** `client/cases/[caseId]/page.tsx` (`client-case-timeline` target) — removed from the tour. Nothing in the client app links to this route today (the Relationships page only shows an inline, unlinked timeline per consultant), so the tour would pause on "Navigate to X" with no way for the client to get there. Re-add a step once a real link to this page exists somewhere in client navigation.

---

## Consultant Tour (30 steps)

Entry point: `<TourTrigger />` in `ConsultantSidebar` bottom section.

| #   | Target                                          | Route                         | Title                    | Content                                                                                                                                    |
| --- | ----------------------------------------------- | ----------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `[data-tour="consultant-sidebar"]`              | `/dashboard`                  | **Welcome**              | "Your morning briefing: today's appointments, critical commitments, priority tasks, and AI summary."                                       |
| 2   | `[data-tour="consultant-morning-brief"]`        | `/dashboard`                  | **Today's Briefing**     | "What needs your attention today. Updates throughout the day."                                                                             |
| 3   | `[data-tour="consultant-daily-timeline"]`       | `/dashboard`                  | **Daily Timeline**       | "Visual heatmap of booked vs available slots across the coming weeks."                                                                     |
| 4   | `[data-tour="consultant-critical-commitments"]` | `/dashboard`                  | **Critical Commitments** | "Overdue or due-soon commitments. Click to jump to the case."                                                                              |
| 5   | `[data-tour="consultant-nav-cases"]`            | `/cases`                      | **Your Cases**           | "All cases assigned to you. Each has a chronological timeline."                                                                            |
| 6   | `[data-tour="consultant-case-timeline"]`        | `/cases/:id`                  | **Case Timeline**        | "The core of Ayushman — sessions, notes, commitments, tasks, documents in one chronological feed. Filter, search, and add entries inline." |
| 7   | `[data-tour="consultant-quick-capture"]`        | (any page)                    | **Quick Capture**        | "This floating button lets you log a note, call, or message from any page. Works offline too."                                             |
| 8   | `[data-tour="consultant-nav-clients"]`          | `/clients`                    | **Client Directory**     | "Search, pin, filter by deadline. Book appointments directly from here."                                                                   |
| 9   | `[data-tour="consultant-nav-availability"]`     | `/availability`               | **Availability**         | "Set weekly hours and block specific dates. This controls when clients can book you."                                                      |
| 10  | `[data-tour="consultant-nav-appointments"]`     | `/appointments`               | **Appointment Queue**    | "Admin-approved requests appear here. Accept or propose a reschedule."                                                                     |
| 11  | `[data-tour="consultant-nav-templates"]`        | `/templates`                  | **Templates**            | "Reusable message templates (email, SMS, WhatsApp) and form templates. Create once, use everywhere."                                       |
| 12  | `[data-tour="consultant-templates-board"]`      | `/templates`                  | **Templates Board**      | "Board view of all your templates. Create new ones with the + button. Filter by type: message or form."                                    |
| 13  | `[data-tour="consultant-nav-workflows"]`        | `/workflows`                  | **Workflows**            | "Automate repetitive tasks. Trigger actions when cases are created, appointments booked, or sessions complete."                            |
| 14  | `[data-tour="consultant-workflows-board"]`      | `/workflows`                  | **Workflows Board**      | "Your personal workflows. Create new ones, view run history, and toggle active/inactive."                                                  |
| 15  | `[data-tour="consultant-nav-referrals"]`        | `/referrals`                  | **Referrals**            | "Cases colleagues send you, and cases you refer out. Track status and view the read-only case."                                            |
| 16  | `[data-tour="consultant-nav-calendar"]`         | `/calendar`                   | **Your Calendar**        | "A calendar view of every appointment on your books."                                                                                      |
| 17  | `[data-tour="consultant-nav-inbox"]`            | `/inbox`                      | **Inbox**                | "Connect your email to see client conversations alongside your cases."                                                                     |
| 18  | `[data-tour="consultant-nav-team"]`             | `/team`                       | **Your Team**            | "See peer consultants in this practice and their current status."                                                                          |
| 19  | `[data-tour="consultant-nav-billing"]`          | `/billing`                    | **Billing**              | "Invoices, payments, and payouts for your client roster."                                                                                  |
| 20  | `[data-tour="consultant-nav-documentation"]`    | `/documentation`              | **Documentation**        | "Documents, form submissions, and shared templates, organized by case."                                                                    |
| 21  | `[data-tour="consultant-nav-help"]`             | `/help`                       | **Help**                 | "Guides, FAQs, and support contacts."                                                                                                      |
| 22  | `[data-tour="consultant-nav-notifications"]`    | `/notifications`              | **Notifications**        | "Choose how you hear about appointments, tasks, and more."                                                                                 |
| 23  | `[data-tour="consultant-nav-settings"]`         | `/settings`                   | **Settings**             | "Your profile, verification documents, and out-of-office schedule."                                                                        |
| 24  | `[data-tour="consultant-appointment-detail"]`   | `/appointments/:id`           | **Appointment Detail**   | "Accept, propose a reschedule, mark complete/no-show, or transfer to a colleague."                                                         |
| 25  | `[data-tour="consultant-new-case-form"]`        | `/cases/new`                  | **New Case**             | "Add a client, attach documents, and start tracking the case."                                                                             |
| 26  | `[data-tour="consultant-referral-detail"]`      | `/referrals/:id`              | **Referral Detail**      | "Review context, accept or decline, and see the read-only case handed to you."                                                             |
| 27  | `[data-tour="consultant-session-recording"]`    | `/sessions/:appointmentId`    | **Session Recording**    | "Record, transcribe, and generate notes right from the session."                                                                           |
| 28  | `[data-tour="consultant-form-builder"]`         | `/templates/forms/new`        | **Form Builder**         | "Drag in fields, set validation, and publish a form clients fill out from their portal."                                                   |
| 29  | `[data-tour="consultant-workflow-canvas"]`      | `/workflows/:workflowId`      | **Workflow Canvas**      | "Wire up triggers, conditions, and actions visually."                                                                                      |
| 30  | `[data-tour="consultant-workflow-runs"]`        | `/workflows/:workflowId/runs` | **Run History**          | "See every execution of this workflow, with status and timing."                                                                            |

**Excluded pages (dead/unreachable routes — left untouched, not toured):**

- `consultant/clients/id/page.tsx` — literal `id` folder, not `[id]`. Unreachable, renders static mock data. There is currently no working client-detail route at all.
- `consultant/sessions/id/page.tsx` — same pattern; the real, wired session route is `sessions/[appointmentId]/page.tsx`.

`templates/forms/[formId]/page.tsx` reuses the same `FormTemplateEditor` component/target as step 28 — no separate step needed.

---

## Tenant Admin Tour (27 steps)

Entry point: `<TourTrigger />` in `TenantAdminSidebar` bottom section.

| #   | Target                                      | Route                        | Title                          | Content                                                                                                                        |
| --- | ------------------------------------------- | ---------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `[data-tour="admin-sidebar"]`               | `/dashboard`                 | **Practice Dashboard**         | "Your command center — practice-wide stats, upcoming appointments, consultant availability, and revenue."                      |
| 2   | `[data-tour="admin-stats-row"]`             | `/dashboard`                 | **Key Metrics**                | "Active clients, total cases, pending appointments, and revenue — all at a glance."                                            |
| 3   | `[data-tour="admin-upcoming-appointments"]` | `/dashboard`                 | **Upcoming Appointments**      | "See what's scheduled across all consultants. Click to view details or propose changes."                                       |
| 4   | `[data-tour="admin-consultant-status"]`     | `/dashboard`                 | **Consultant Status**          | "Workload snapshot per consultant — available hours, active cases, and availability status."                                   |
| 5   | `[data-tour="admin-nav-consultants"]`       | `/consultants`               | **Consultant Directory**       | "View and manage all consultants. Edit profiles, view availability, monitor utilization."                                      |
| 6   | `[data-tour="admin-nav-applications"]`      | `/consultant-applications`   | **Applications**               | "Review consultant applications. Generate invite codes to recruit new consultants."                                            |
| 7   | `[data-tour="admin-nav-clients"]`           | `/clients`                   | **Client Directory**           | "All clients in your practice. Filter by case status and deadlines. Book on their behalf."                                     |
| 8   | `[data-tour="admin-nav-appointments"]`      | `/appointments`              | **Appointment Queue**          | "New booking requests land here first. Approve, reschedule, or reject — then the consultant accepts or declines."              |
| 9   | `[data-tour="admin-nav-scheduler"]`         | `/scheduler`                 | **Master Scheduler**           | "Bird's-eye view of every consultant's schedule. Spot conflicts, see utilization, resolve overlaps."                           |
| 10  | `[data-tour="admin-nav-templates"]`         | `/templates`                 | **Templates**                  | "Create message and form templates for your practice. Share them with consultants."                                            |
| 11  | `[data-tour="admin-templates-board"]`       | `/templates`                 | **Templates Board**            | "Board view of all templates. Filter by type. Create new with the + button."                                                   |
| 12  | `[data-tour="admin-nav-workflows"]`         | `/workflows`                 | **Workflows**                  | "Automate actions on case creation, booking, and session completion."                                                          |
| 13  | `[data-tour="admin-workflows-board"]`       | `/workflows`                 | **Workflows Board**            | "Tenant-wide workflows. View run history, toggle active/inactive."                                                             |
| 14  | `[data-tour="admin-nav-settings"]`          | `/settings`                  | **Practice Settings**          | "Configure branding, currency, payout cycle, booking cutoff hours, and auto-approve defaults."                                 |
| 15  | `[data-tour="admin-nav-audit-log"]`         | `/audit-log`                 | **Audit Log**                  | "Every sensitive action in your practice — logins, edits, approvals — with who, what, and when."                               |
| 16  | `[data-tour="admin-nav-billing"]`           | `/billing`                   | **Billing**                    | "Overview, invoices, and the payments ledger for your practice — all in one place."                                            |
| 17  | `[data-tour="admin-nav-calendar"]`          | `/calendar`                  | **Practice Calendar**          | "Every consultant's sessions in one calendar. Filter by consultant, spot gaps and overlaps."                                   |
| 18  | `[data-tour="admin-nav-contacts"]`          | `/contacts`                  | **Contacts**                   | "A CRM-style directory of leads and contacts before they become clients."                                                      |
| 19  | `[data-tour="admin-nav-grievance"]`         | `/grievance`                 | **Escalate to Platform**       | "Raise an issue directly with the Ayushman platform team and track your escalations."                                          |
| 20  | `[data-tour="admin-nav-inbox"]`             | `/inbox`                     | **Inbox**                      | "Connect and manage your practice's shared email/WhatsApp inbox in one workspace."                                             |
| 21  | `[data-tour="admin-nav-notifications"]`     | `/notifications`             | **Notifications**              | "Choose how you're notified about consultants, tasks, and practice activity."                                                  |
| 22  | `[data-tour="admin-appointment-detail"]`    | `/appointments/:id`          | **Review a Request**           | "Approve, reject, or propose a reschedule for this booking request. Reasons are sent back to the client and consultant."       |
| 23  | `[data-tour="admin-new-appointment-form"]`  | `/appointments/new`          | **Book on Behalf of a Client** | "Pick an existing client and case, or add a new client, then choose a consultant and time slot."                               |
| 24  | `[data-tour="admin-case-timeline"]`         | `/cases/:id`                 | **Case Timeline**              | "Sessions, notes, commitments, tasks, and documents for this case in one chronological feed — same view your consultants use." |
| 25  | `[data-tour="admin-consultant-detail"]`     | `/consultants/:consultantId` | **Consultant Profile**         | "Edit profile details, review verification documents, and set weekly availability hours."                                      |
| 26  | `[data-tour="admin-template-editor"]`       | `/templates/:templateId`     | **Template Editor**            | "Write your message or form template, add merge fields, and save. Use it across appointments and workflows."                   |
| 27  | `[data-tour="admin-workflow-canvas"]`       | `/workflows/:workflowId`     | **Build a Workflow**           | "Drag steps onto the canvas — triggers, conditions, actions — and connect them to automate your practice."                     |

**Excluded pages:**

- `admin/insights/page.tsx` — orphaned (no sidebar link anywhere), `ComingSoon` placeholder. Add to tour once shipped and linked.
- `admin/help/page.tsx` — support page, low priority.
- `admin/scheduler/[consultantId]/page.tsx` — still renders hardcoded mock data, not wired to real data yet.

**Shared-component note:** `workflow-canvas.tsx` is shared between the consultant and admin roles. Its root `data-tour` is role-aware (`viewerRole === "TENANT_ADMIN" ? "admin-workflow-canvas" : "consultant-workflow-canvas"`) to avoid a duplicate-attribute collision. `case-timeline.tsx` (shared by client/consultant/admin) has no built-in `data-tour` of its own except the client's — consultant and admin instead wrap it in a page-local `div` carrying their own `data-tour` value, so all three roles resolve independently without collision.

---

## Super Admin Tour (7 steps)

Entry point: `<TourTrigger />` in `PlatformSidebar` bottom section. Originally scoped to templates/workflows only; broadened with a Dashboard + Tenants prelude since those are the more central super-admin surfaces.

| #   | Target                                             | Route                  | Title                    | Content                                                                                                                   |
| --- | -------------------------------------------------- | ---------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | `[data-tour="superadmin-sidebar"]`                 | `/dashboard`           | **Welcome, Super Admin** | "Your platform command center — manage every tenant, monitor health, and control what's shared across the whole product." |
| 2   | `[data-tour="superadmin-stats-grid"]`              | `/dashboard`           | **Platform at a Glance** | "Tenant counts, activity, and growth — the numbers that matter across the whole platform."                                |
| 3   | `[data-tour="superadmin-nav-tenants"]`             | `/tenants`             | **Tenant Directory**     | "Every practice on the platform. Search, filter, and drill into any tenant's cases, clients, consultants, and workflows." |
| 4   | `[data-tour="superadmin-nav-workflows"]`           | `/workflows`           | **Community Workflows**  | "Platform-wide automation workflows. Manage and deploy across all tenants."                                               |
| 5   | `[data-tour="superadmin-nav-templates"]`           | `/templates`           | **Community Templates**  | "Platform-wide message and form templates available to all tenants."                                                      |
| 6   | `[data-tour="superadmin-templates-board"]`         | `/templates`           | **Create & Manage**      | "Create new community templates or edit existing ones. These appear in every tenant's template library."                  |
| 7   | `[data-tour="superadmin-nav-community-templates"]` | `/community-templates` | **Template Moderation**  | "Review templates submitted by tenant admins. Approve or reject with feedback."                                           |

**Excluded pages (not toured, by design):** `payments`, `audit-log`, `grievances`, `notify` (+ `notify/create`), `microservices`, and the `tenants/[id]/...` drill-down sub-routes. These are real, linked, non-orphaned pages — kept out of the linear tour to avoid growing it past a short onboarding flow. Revisit if a fuller superadmin tour (matching the depth of Admin/Consultant) is wanted later.

---

## data-tour Attribute Reference

### Client

| File                                                      | Attribute                                                                                                                                                                                                                        |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tenant/client/sidebar.tsx`                               | `client-sidebar`, `client-nav-relationships`, `client-nav-tasks`, `client-nav-docs`, `client-nav-notifications`, `client-nav-appointments`, `client-nav-book`, `client-nav-documents`, `client-nav-inbox`, `client-nav-settings` |
| `client/dashboard/page.tsx`                               | `client-stats`, `client-appointments-tab`, `client-book-cta`                                                                                                                                                                     |
| `tenant/client/appointments/client-appointments-view.tsx` | `client-appointments-list`                                                                                                                                                                                                       |
| `tenant/client/appointments/book-appointment-flow.tsx`    | `client-book-flow-steps`                                                                                                                                                                                                         |
| `client/documents/documents-client.tsx`                   | `client-documents-list`                                                                                                                                                                                                          |
| `tenant/client/settings/become-consultant-card.tsx`       | `client-become-consultant`                                                                                                                                                                                                       |

### Consultant

| File                                                                    | Attribute                                                                                  |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `tenant/consultant/sidebar.tsx`                                         | `consultant-sidebar` + all `consultant-nav-*` links + `consultant-new-case-cta`            |
| `consultant/dashboard/page.tsx`                                         | `consultant-morning-brief`, `consultant-daily-timeline`, `consultant-critical-commitments` |
| `consultant/cases/[id]/page.tsx`                                        | `consultant-case-timeline`                                                                 |
| `tenant/consultant/appointments/consultant-appointment-detail-view.tsx` | `consultant-appointment-detail`                                                            |
| `consultant/cases/new/page.tsx`                                         | `consultant-new-case-form`                                                                 |
| `consultant/referrals/[id]/page.tsx`                                    | `consultant-referral-detail`                                                               |
| `consultant/sessions/[appointmentId]/page.tsx`                          | `consultant-session-recording`                                                             |
| `tenant/shared/forms/form-template-editor.tsx`                          | `consultant-form-builder`                                                                  |
| `tenant/shared/workflows/workflow-canvas.tsx`                           | `consultant-workflow-canvas` / `admin-workflow-canvas` (role-aware)                        |
| `tenant/shared/workflows/workflow-runs.tsx`                             | `consultant-workflow-runs`                                                                 |

### Tenant Admin

| File                                                            | Attribute                                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `tenant/admin/nav.tsx` (rendered on `tenant/admin/sidebar.tsx`) | `admin-sidebar` + all `admin-nav-*` links                                   |
| `admin/dashboard/page.tsx`                                      | `admin-stats-row`, `admin-upcoming-appointments`, `admin-consultant-status` |
| `tenant/admin/appointments/appointment-detail-view.tsx`         | `admin-appointment-detail`                                                  |
| `admin/appointments/new/page.tsx`                               | `admin-new-appointment-form`                                                |
| `admin/cases/[id]/page.tsx`                                     | `admin-case-timeline`                                                       |
| `tenant/admin/consultants-directory/consultant-detail-form.tsx` | `admin-consultant-detail`                                                   |
| `tenant/shared/templates/template-editor.tsx`                   | `admin-template-editor`                                                     |
| `tenant/shared/workflows/workflow-canvas.tsx`                   | `admin-workflow-canvas` (role-aware, see above)                             |

### Super Admin

| File                                | Attribute                                                                                                              |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `platform/sidebar.tsx`              | `superadmin-sidebar`                                                                                                   |
| `platform-nav.tsx`                  | `superadmin-nav-tenants`, `superadmin-nav-templates`, `superadmin-nav-community-templates`, `superadmin-nav-workflows` |
| `platform/dashboard/stats-grid.tsx` | `superadmin-stats-grid`                                                                                                |
| `superadmin/templates/page.tsx`     | `superadmin-templates-board`                                                                                           |

---

## Zustand Store Shape

```ts
interface TourState {
  isActive: boolean;
  activeStep: number;
  pausedAt: string | null; // route where tour paused waiting for navigation
  completedRoles: string[]; // persisted to localStorage: ["client"], ["consultant"], etc.

  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  pauseForNavigation: (route: string) => void;
  resume: () => void;
  complete: () => void; // adds role to completedRoles, saves to localStorage
  resetRole: (role: string) => void; // removes role from completedRoles (for retake)
}
```

## localStorage

- **Key:** `ayushman-tour-completed`
- **Value:** `string[]` — role names that have completed the tour (e.g. `["client", "consultant"]`)
- **Written by:** `tour-store.ts` on `complete()`
- **Read by:** `TourProvider` on mount (auto-start check) and `TourTrigger` (button label)
