# Instructions: Templates & Workflows — Tech Stack, Schema, Sprint Placement

## Context / Verification against existing docs

Checked against `schema_ayushman_v3.md` (`packages/db/prisma/schema.prisma`), `sprints_v3.md`, `Ayushman_data_api_v4.md`, `PRD_v3_nextjs_express.md`, and the existing frontend at
[apps/web/components/tenant/shared/templates/](apps/web/components/tenant/shared/templates/) and
[apps/web/components/tenant/shared/workflows/](apps/web/components/tenant/shared/workflows/).

- **Templates** ([templates-board.tsx](apps/web/components/tenant/shared/templates/templates-board.tsx), [template-editor.tsx](apps/web/components/tenant/shared/templates/template-editor.tsx)) and **Workflows** ([workflows-board.tsx](apps/web/components/tenant/shared/workflows/workflows-board.tsx), [workflow-builder.tsx](apps/web/components/tenant/shared/workflows/workflow-builder.tsx), [reminders-panel.tsx](apps/web/components/tenant/shared/workflows/reminders-panel.tsx)) are **frontend-only mockups today** — all state is `useState`, Save buttons are `disabled`, there is no route or Prisma model behind either surface.
- `schema.prisma` has **no `Template` or `Workflow` model**. The only adjacent model is `CommitmentTemplate` (§3.14, a per-consultant library of _task/commitment text_, unrelated to rich-text document templates or event-driven automation).
- `sprints.md` has no sprint for either feature — this is genuinely greenfield, not a gap in an existing sprint.
- **No schema changes exist yet to reference** — this doc proposes them.

---

## 1. Templates — reusable client documents

### Use cases (per requirements)

1. A doc editor with organization (collections/folders) and a header, for client-facing documents.
2. Easy to create/edit — no learning curve, block-style editing.

### Tech stack decision

Keep exactly what's already wired in [template-editor.tsx](apps/web/components/tenant/shared/templates/template-editor.tsx) — **Tiptap** (`@tiptap/react`, StarterKit + Table + Image + TextAlign + FontFamily). Do not introduce a second editor library (e.g. Slate, Lexical, BlockNote). This is the simplest path because the toolbar, collections selector, and AI-agent side panel are already built against Tiptap's `Editor` API.

- **Persist `editor.getJSON()`** (Tiptap's ProseMirror JSON), not `getHTML()`. JSON round-trips losslessly back into the editor for re-editing; HTML is a lossy derived format. Render to HTML only at send/print/PDF time (`generateHTML()` from `@tiptap/html`, server-side in `apps/api`).
- **Community templates tab** (cross-tenant marketplace with ratings/usage counts) needs moderation, a shared public read path, and licensing decisions — **defer to Phase 13 backlog**. Ship "My templates" (per-consultant) + "Organization templates" (per-tenant, `TENANT_ADMIN`-authored) only for v1.
- The AI agent panel in `template-editor.tsx` is currently a fully local, hard-coded keyword matcher (`runAgent()` in-file). Leave it exactly as-is for v1 (it already satisfies "easy to edit" via canned scaffolds) — wiring it to a real LLM is a separate, later task, not part of persistence.

### Schema addition

```prisma
enum TemplateScope {
  PERSONAL      // consultant's own library
  ORGANIZATION  // shared tenant-wide, authored by TENANT_ADMIN or a consultant who opts to share

  @@map("template_scope")
}

model Template {
  id           String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId     String        @map("tenant_id") @db.Uuid
  consultantId String?       @map("consultant_id") @db.Uuid // author; null for ORGANIZATION templates authored by a TENANT_ADMIN
  scope        TemplateScope @default(PERSONAL)
  collection   String        @db.VarChar(50) // matches template-editor.tsx `collections`: notes | forms | assessments | plans-reports | worksheets | guidelines
  title        String        @db.VarChar(200)
  description  String?
  contentJson  Json          @default("{}") // Tiptap/ProseMirror doc — editor.getJSON()
  isActive     Boolean       @default(true) @map("is_active")
  createdAt    DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime      @updatedAt @map("updated_at") @db.Timestamptz(6)

  tenant     Tenant             @relation(fields: [tenantId], references: [id])
  consultant ConsultantProfile? @relation(fields: [consultantId], references: [id], onDelete: Cascade)

  @@index([tenantId, scope])
  @@index([consultantId])
  @@map("templates")
}
```

No `folders` table for v1 — `templates-board.tsx`'s "Folders" grid is presentational grouping by `collection`; a dedicated folder hierarchy is unrequested scope.

### API

- `GET/POST /tenants/:tenantId/consultants/:consultantId/templates` — list/create `PERSONAL` templates (own only).
- `GET/POST /tenants/:tenantId/templates?scope=ORGANIZATION` — list/create org templates (`TENANT_ADMIN`, or a consultant explicitly promoting a `PERSONAL` template via `PATCH .../scope`).
- `PATCH/DELETE /tenants/:tenantId/templates/:templateId` — row-ownership check: `PERSONAL` editable by its `consultantId` only; `ORGANIZATION` editable by `TENANT_ADMIN` or original author.
- **Wiring:** `templates-board.tsx`'s `openEditor()` currently pushes to `.../new?from=<id>`; that route loads `template-editor.tsx`, which should `GET` the template by id to hydrate `editor.commands.setContent(contentJson)`, and `handleSave()` should `POST`/`PATCH` `{ title, description, collection, contentJson: editor.getJSON() }`.

---

## 2. Workflows — event-driven automation

### Use case (per requirements)

Determine event-based nodes/actions: a **trigger** (domain event) fans out to one or more **actions**, matching the shape already drawn in [workflow-builder.tsx](apps/web/components/tenant/shared/workflows/workflow-builder.tsx) (`trigger` → `forms` → `email`/`sms`).

### Tech stack decision

- **Canvas: keep React Flow** (`@xyflow/react`) — already integrated, MIT-licensed, no reason to swap.
- **Execution engine: a small custom switch/dispatch executor in `apps/api`, not `json-rules-engine`.** The trigger set is a fixed, small enum (client created, appointment booked/declined/cancelled/rescheduled, form submitted) with no user-composable boolean condition trees in the current UI (`StepSettings` only lets you pick _which_ trigger, not AND/OR conditions on it). A rules-engine dependency buys nothing here and adds a fact-model abstraction to learn; a `switch (trigger.type)` dispatcher reading `Workflow.nodesJson`/`edgesJson` is simpler and matches CLAUDE.md's "simplicity first." Revisit `json-rules-engine` only if/when the product actually needs conditional branching (e.g. "if client category = X").
- **Reuse Sprint 5.1's notification dispatch** (`apps/api/src/integrations/twilio.ts`, `resend.ts`, the single `dispatch()` entry point) for the `email`/`sms` action nodes — do not build a second send path.

### Schema addition

```prisma
enum WorkflowTrigger {
  APPOINTMENT_BOOKED
  APPOINTMENT_DECLINED
  APPOINTMENT_CANCELLED
  APPOINTMENT_RESCHEDULED
  FORM_SUBMITTED

  @@map("workflow_trigger")
}

model Workflow {
  id           String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId     String          @map("tenant_id") @db.Uuid
  consultantId String          @map("consultant_id") @db.Uuid
  title        String          @db.VarChar(200)
  trigger      WorkflowTrigger
  nodesJson    Json            @map("nodes_json") // React Flow Node[] (StepData), incl. per-node action config (template ids, email/SMS body)
  edgesJson    Json            @map("edges_json") // React Flow Edge[]
  isActive     Boolean         @default(false) @map("is_active")
  createdAt    DateTime        @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime        @updatedAt @map("updated_at") @db.Timestamptz(6)

  consultant ConsultantProfile @relation(fields: [consultantId], references: [id], onDelete: Cascade)

  @@index([tenantId, trigger, isActive])
  @@map("workflows")
}
```

Action config (which forms to attach, email subject/body) lives **inside `nodesJson`** per node, not in separate normalized tables — node shape already varies per action type (`forms` vs `email` vs `sms`), so normalizing now would mean a table per action type for no query benefit (nothing queries "all email actions" independent of their workflow).

### Reminders (`reminders-panel.tsx`)

This is a distinct, simpler shape than the node-graph workflows: fixed reminder _kinds_ (appointment, intake, invoice, portal-invite), each with N `{channel, timing}` rows. It does **not** fit `NotificationPreference` (§3.22, one row per user/type/channel — no room for multiple differently-timed reminders of the same kind). Add:

```prisma
enum ReminderKind {
  APPOINTMENT
  INTAKE
  INVOICE
  PORTAL_INVITE

  @@map("reminder_kind")
}

model ReminderRule {
  id           String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId     String              @map("tenant_id") @db.Uuid
  consultantId String              @map("consultant_id") @db.Uuid
  kind         ReminderKind
  channel      NotificationChannel
  offsetMins   Int                 @map("offset_mins") // signed: negative = before the anchor event, positive = after
  createdAt    DateTime            @default(now()) @map("created_at") @db.Timestamptz(6)

  consultant ConsultantProfile @relation(fields: [consultantId], references: [id], onDelete: Cascade)

  @@index([consultantId, kind])
  @@map("reminder_rules")
}
```

Reuses `NotificationChannel` (already defined, §3.22). Execution reuses **Sprint 5.2's cron jobs** (`apps/api/src/cron/reminders.ts`) — extend that job to also scan `reminder_rules` for `INTAKE`/`INVOICE`/`PORTAL_INVITE` kinds (`APPOINTMENT` is already its cron responsibility per Sprint 5.1 item 4), rather than writing a new scheduler.

### API

- `GET/POST/PATCH/DELETE /tenants/:tenantId/consultants/:consultantId/workflows` — full CRUD, `CONSULTANT` self-scoped (row-ownership check, same pattern as `cases.router.ts`).
- `GET/POST/PATCH/DELETE /tenants/:tenantId/consultants/:consultantId/reminder-rules`.
- **No separate "execute" endpoint** — triggers fire from inside existing service calls (e.g. `client.service.ts`'s create-client function, `booking.service.ts`'s booking/cancel/decline/reschedule functions) via a single `workflowExecutor.fire(tenantId, trigger, context)` call, which queries `workflows` where `tenantId + trigger + isActive`, then dispatches each node in `nodesJson` order.
- **Wiring:** `workflow-builder.tsx`'s disabled `Save` button should `POST`/`PATCH` `{ title, trigger, nodesJson: nodes, edgesJson: initialEdges }`; the `Activate/Deactivate workflow` button toggles `isActive`. `workflows-board.tsx`'s "New workflow" dialog should create a `Workflow` row with an empty two-node (`trigger` + one action) default graph before navigating into the builder.

---

## 3. Sprint placement

Neither feature has an existing sprint slot — add as new sprints, placed where their dependencies are actually satisfied:

> **New — Sprint 4.6: Document Template Library** (after Sprint 4.5, since it depends on the Tiptap editor already built and conceptually parallels `commitment_templates` from Sprint 4.4): add `Template` model + migration; build `templates.router.ts`/`templates.service.ts`; wire `templates-board.tsx` and `template-editor.tsx` to real persistence (`contentJson` via `editor.getJSON()`); ship "My templates" + "Organization templates" only, defer "Community templates" to Phase 13.

> **New — Sprint 5.3: Workflow Automation Engine & Reminder Rules** (after Sprint 5.2, since it depends on Sprint 5.1's `dispatch()` and Sprint 5.2's cron infrastructure): add `Workflow` + `ReminderRule` models + migration; build `workflows.router.ts` and `reminder-rules.router.ts`; build `workflow-executor.service.ts` (custom switch-based dispatcher, not a rules-engine dependency — see rationale above) and call `workflowExecutor.fire(...)` from the client-create and appointment lifecycle service functions (Sprints 2.3, 3.2–3.4); extend `apps/api/src/cron/reminders.ts` to also read `reminder_rules`; wire `workflow-builder.tsx`, `workflows-board.tsx`, and `reminders-panel.tsx` to the new endpoints.
