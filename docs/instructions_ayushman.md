# Instructions v2: Templates & Workflows — Production-Grade Design & Sprint Breakdown

Supersedes `instructions.md`. Verified against `schema_ayushman_v3.md`, `sprints_v3.md`, `Ayushman_data_api_v4.md`, `PRD_v3_nextjs_express.md`, and the existing frontend mockups at `apps/web/components/tenant/shared/templates/` and `.../workflows/`.

**What changed from v1 and why:**

1. Added an execution/audit trail (`WorkflowRun`) — v1 had no way to answer "why didn't this workflow fire" or "what did it actually send," which is a support/debugging blocker in production.
2. Moved workflow execution off the request path into an outbox + cron pattern — v1's synchronous `workflowExecutor.fire()` call inside `booking.service.ts` would block/risk a booking transaction on a flaky Twilio/Resend call.
3. Added idempotency keys to both workflow runs and reminder dispatches — v1 had no guard against a cron overlap or retry double-sending a client an SMS.
4. Added template versioning (lightweight, append-only) — v1 only stored the current `contentJson`, so an accidental bad edit had no recovery path.
5. Added guardrails against runaway/self-triggering workflows.
6. Answered the n8n question (see chat) — confirmed the custom-dispatcher decision from v1, not a reversal.
7. Split both v1 sprints (4.6, 5.3) into smaller, independently shippable sprints.

---

## 1. Templates — reusable client documents

### Tech stack decision (unchanged from v1, confirmed correct)

Keep **Tiptap** (`@tiptap/react`) — already wired into `template-editor.tsx`. Persist `editor.getJSON()`, not `getHTML()`. Render to HTML only at send/print/PDF time via `generateHTML()` server-side in `apps/api`. No second editor library.

### Schema — production-grade version

```prisma
enum TemplateScope {
  PERSONAL
  ORGANIZATION

  @@map("template_scope")
}

model Template {
  id           String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId     String        @map("tenant_id") @db.Uuid
  consultantId String?       @map("consultant_id") @db.Uuid
  scope        TemplateScope @default(PERSONAL)
  collection   String        @db.VarChar(50)
  title        String        @db.VarChar(200)
  description  String?
  contentJson  Json          @default("{}")
  version      Int           @default(1)              // NEW — bumped on every save, written alongside the snapshot below
  isActive     Boolean       @default(true) @map("is_active")
  deletedAt    DateTime?     @map("deleted_at") @db.Timestamptz(6)   // NEW — soft delete, matches the 30-day recovery pattern used elsewhere (schema §5)
  createdAt    DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime      @updatedAt @map("updated_at") @db.Timestamptz(6)

  tenant     Tenant             @relation(fields: [tenantId], references: [id])
  consultant ConsultantProfile? @relation(fields: [consultantId], references: [id], onDelete: Cascade)
  versions   TemplateVersion[]

  @@index([tenantId, scope])
  @@index([consultantId])
  @@index([deletedAt])
  @@map("templates")
}

// NEW — append-only snapshot on every save, lets a consultant recover from a bad edit
// without needing full CRDT/diffing infra. Capped: keep the last 20 per template via
// a cron sweep (`cron/template-version-prune.ts`), not enforced at insert time.
model TemplateVersion {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  templateId String   @map("template_id") @db.Uuid
  version    Int
  contentJson Json    @map("content_json")
  savedBy    String   @map("saved_by") @db.Uuid   // consultant/admin user id
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  template Template @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@unique([templateId, version])
  @@index([templateId, createdAt(sort: Desc)])
  @@map("template_versions")
}
```

No `folders` table — same call as v1, `templates-board.tsx`'s grouping stays presentational over `collection`.

### API (unchanged endpoints, one addition)

- `GET/POST /tenants/:tenantId/consultants/:consultantId/templates`
- `GET/POST /tenants/:tenantId/templates?scope=ORGANIZATION`
- `PATCH/DELETE /tenants/:tenantId/templates/:templateId` — `DELETE` is a soft delete (`deletedAt`), matching the interactions/documents retention convention already in the schema, not a hard delete.
- **NEW** `GET /tenants/:tenantId/templates/:templateId/versions` and `POST /tenants/:tenantId/templates/:templateId/versions/:versionId/restore` — restore copies that snapshot's `contentJson` back onto the live row as a new version (never overwrites history).
- `PATCH .../scope` — promote PERSONAL → ORGANIZATION, same as v1.

Every `PATCH` that changes `contentJson` writes a `TemplateVersion` row in the same transaction and increments `version` — this is the one behavioral change in `templates.service.ts` versus v1's plan.

---

## 2. Workflows — event-driven automation

### Tech stack decision (confirmed, with the n8n question resolved)

- **Canvas:** React Flow (`@xyflow/react`) — unchanged.
- **Execution engine:** custom dispatcher in `apps/api`, **not** `json-rules-engine`, and **not** n8n. n8n's Sustainable Use License requires an Enterprise/Embed commercial agreement the moment you host workflow automation on behalf of external customers (see chat for the licensing detail) — that's exactly this feature, so it's a non-starter without a paid agreement Anthropic/Ayushman hasn't budgeted for. The trigger set is still a fixed small enum with no user-composable condition trees, so a `switch (trigger.type)` dispatcher remains the right level of complexity.
- **Notification reuse:** Sprint 5.1's `dispatch()` — unchanged.

### Production-grade change: execution moves off the request path

v1 had `client.service.ts` / `booking.service.ts` call `workflowExecutor.fire()` **synchronously**, inline in the same request. In production this couples a booking transaction's success to Twilio/Resend's uptime and latency, and gives no record of what actually happened if a node fails.

**New pattern — outbox + cron:**

1. The domain event (client created, appointment booked, etc.) writes a `WorkflowRun` row with `status = PENDING` **inside the same transaction** as the domain write itself (cheap, no external calls, can't fail independently of the transaction it belongs to).
2. `apps/api/src/cron/workflow-runner.ts` (new, runs every ~1 min) picks up `PENDING` runs, executes each node in `nodesJson` order, and writes the outcome back — this is where Twilio/Resend calls actually happen, fully decoupled from the request that created the run.
3. Retries: up to 3 attempts with backoff for `FAILED` runs where the failure looks transient (network/5xx); a 4th failure is terminal (`status = FAILED`) and surfaces in a "failed workflow runs" admin view — no silent drops.

### Schema — production-grade version

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
  nodesJson    Json            @map("nodes_json")
  edgesJson    Json            @map("edges_json")
  maxNodes     Int             @default(20) @map("max_nodes")   // NEW — guardrail, enforced at save time in workflows.router.ts
  isActive     Boolean         @default(false) @map("is_active")
  createdAt    DateTime        @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime        @updatedAt @map("updated_at") @db.Timestamptz(6)

  consultant ConsultantProfile @relation(fields: [consultantId], references: [id], onDelete: Cascade)
  runs       WorkflowRun[]

  @@index([tenantId, trigger, isActive])
  @@map("workflows")
}

enum WorkflowRunStatus {
  PENDING
  RUNNING
  SUCCEEDED
  PARTIAL       // some action nodes sent, at least one failed terminally
  FAILED

  @@map("workflow_run_status")
}

// NEW — the outbox row + the audit trail in one table. One row per trigger firing.
model WorkflowRun {
  id             String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId       String            @map("tenant_id") @db.Uuid
  workflowId     String            @map("workflow_id") @db.Uuid
  trigger        WorkflowTrigger
  idempotencyKey String            @map("idempotency_key") @db.VarChar(200) // e.g. `${workflowId}:${triggerEntityId}` — prevents double-fire on retry/overlap
  contextJson    Json              @map("context_json")   // the domain payload the trigger fired with (clientId, appointmentId, etc.)
  status         WorkflowRunStatus @default(PENDING)
  nodeResultsJson Json?            @map("node_results_json") // per-node outcome: {nodeId, status, sentAt, error?}[] — the debuggability piece
  attempts       Int               @default(0)
  nextAttemptAt  DateTime?         @map("next_attempt_at") @db.Timestamptz(6)
  createdAt      DateTime          @default(now()) @map("created_at") @db.Timestamptz(6)
  completedAt    DateTime?         @map("completed_at") @db.Timestamptz(6)

  workflow Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)

  @@unique([workflowId, idempotencyKey])
  @@index([status, nextAttemptAt])   // the exact query workflow-runner.ts polls on
  @@index([tenantId, createdAt(sort: Desc)])
  @@map("workflow_runs")
}
```

Action config still lives inside `nodesJson` per node — unchanged from v1, still correct (nothing queries "all email actions" independent of their workflow).

**Guardrail against runaway workflows:** `workflow-executor.service.ts` refuses to fire a workflow whose own action nodes would re-trigger the same `WorkflowTrigger` on the same entity within the same run (e.g., an email-send action node can never itself be a `FORM_SUBMITTED` trigger source in a single hop) — checked by trigger-type, not by simulating the whole graph. `maxNodes` caps graph size at save time to bound worst-case run duration.

### Reminders — production-grade version

Same shape decision as v1 (doesn't fit `NotificationPreference`), plus an idempotency guard:

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
  offsetMins   Int                 @map("offset_mins")
  createdAt    DateTime            @default(now()) @map("created_at") @db.Timestamptz(6)

  consultant ConsultantProfile @relation(fields: [consultantId], references: [id], onDelete: Cascade)
  dispatches ReminderDispatchLog[]

  @@index([consultantId, kind])
  @@map("reminder_rules")
}

// NEW — one row per (rule, anchor entity) actually sent. Unique constraint is the
// idempotency guard: if cron/reminders.ts overlaps or retries, the second attempt
// no-ops on a unique-violation instead of double-sending a client an SMS.
model ReminderDispatchLog {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  ruleId         String   @map("rule_id") @db.Uuid
  anchorEntityId String   @map("anchor_entity_id") @db.Uuid // appointmentId / invoiceId / etc., per `kind`
  sentAt         DateTime @default(now()) @map("sent_at") @db.Timestamptz(6)

  rule ReminderRule @relation(fields: [ruleId], references: [id], onDelete: Cascade)

  @@unique([ruleId, anchorEntityId])
  @@map("reminder_dispatch_log")
}
```

Execution still extends Sprint 5.2's `apps/api/src/cron/reminders.ts` — the only addition is: before dispatch, `INSERT ... ON CONFLICT DO NOTHING` into `reminder_dispatch_log`; only proceed to `dispatch()` if the insert actually happened.

### API (unchanged from v1, plus run visibility)

- `GET/POST/PATCH/DELETE /tenants/:tenantId/consultants/:consultantId/workflows`
- `GET/POST/PATCH/DELETE /tenants/:tenantId/consultants/:consultantId/reminder-rules`
- **NEW** `GET /tenants/:tenantId/workflows/:workflowId/runs` — paginated run history with `nodeResultsJson`, powers a "why didn't this fire" debug view.
- Still no separate "execute" endpoint — a `WorkflowRun` row is written inside the existing service transactions (`client.service.ts`, `booking.service.ts`), never invoked directly from the frontend.

---

## 3. Sprint placement — split into smaller, independently shippable units

Same placement logic as v1 (Templates after 4.5, Workflows after 5.2), but each broken into 2–4 sprints so a sprint review has one coherent slice to demo rather than "the whole feature."

> **Sprint 4.6a: Template Persistence (Backend Only)**
> Add `Template` + `TemplateVersion` models + migration. Build `templates.router.ts`/`templates.service.ts`: PERSONAL CRUD, versioning-on-save, soft delete. No frontend wiring yet — verify via API tests/Postman.

> **Sprint 4.6b: Organization Templates & Scope Promotion**
> Add the `ORGANIZATION` scope path: `GET/POST .../templates?scope=ORGANIZATION`, `PATCH .../scope` promotion, row-ownership rules (`TENANT_ADMIN` or original author only). Depends on 4.6a.

> **Sprint 4.6c: Frontend Wiring & Version Restore UI**
> Wire `templates-board.tsx` and `template-editor.tsx` to the real endpoints from 4.6a/b (`editor.getJSON()`/`setContent()`, enable the currently-disabled Save button). Add the version-history panel + restore action. Depends on 4.6a, 4.6b.
>
> _(Community templates marketplace: still deferred to Phase 13 backlog — unchanged from v1.)_

---

> **Sprint 5.3a: Workflow Schema, Outbox & Executor Core**
> Add `Workflow` + `WorkflowRun` models + migration. Build `workflow-executor.service.ts` (switch-based dispatcher, idempotency-key handling, guardrail against same-trigger re-fire, retry/backoff logic) and `apps/api/src/cron/workflow-runner.ts`. No trigger wiring yet — testable in isolation by inserting `WorkflowRun` rows directly.

> **Sprint 5.3b: Trigger Wiring & Workflow CRUD API**
> Build `workflows.router.ts` (full CRUD, row-ownership). Wire `WorkflowRun` inserts into `client.service.ts`'s create-client function and `booking.service.ts`'s book/decline/cancel/reschedule functions (Sprints 2.3, 3.2–3.4). Depends on 5.3a.

> **Sprint 5.3c: Reminder Rules & Idempotent Dispatch**
> Add `ReminderRule` + `ReminderDispatchLog` models + migration. Build `reminder-rules.router.ts`. Extend `apps/api/src/cron/reminders.ts` to scan `reminder_rules` for `INTAKE`/`INVOICE`/`PORTAL_INVITE` (APPOINTMENT stays Sprint 5.1's responsibility), with the `ON CONFLICT DO NOTHING` dispatch guard. Independent of 5.3a/b — can ship in parallel.

> **Sprint 5.3d: Frontend Wiring & Run History View**
> Wire `workflow-builder.tsx` (`Save`/`Activate` buttons → `POST`/`PATCH`, empty-graph default on "New workflow" in `workflows-board.tsx`) and `reminders-panel.tsx` to their respective endpoints. Add the `GET .../workflows/:id/runs` debug view (node-by-node outcome, retry status). Depends on 5.3a, 5.3b, 5.3c.
