**Goal**: Consultants can author reusable, mergeable-field message templates (Personal/Tenant/Community scoped) and reusable dynamic forms with custom fields, then wire both into visual, node-based automations — a Carepatron-style workflow builder — running entirely on open-source software already available in the existing Supabase/Postgres stack. Depends on Phase 5 (`notification_preferences`, `twilio.ts`, `resend.ts`) already existing, since the execution engine dispatches through that same integration layer rather than duplicating it.

### Sprint 5.5.1: Schema, RLS & Template Engine

1. Migrate `workflows`, `workflow_runs`, `workflow_templates` into `packages/db/prisma/schema.prisma` as schema §3.26–3.28 — tenant-scoped, soft-deletable, following the existing table pattern. `workflow_templates` carries a `scope` column (`template_scope` enum: `TENANT` / `COMMUNITY` / `PERSONAL`, default `PERSONAL`).
2. Write the custom RLS policy set for `workflow_templates` under `supabase/policies/` — this table is the one exception in this phase, alongside `grievances`, since it can't use the standard tenant-isolation policy:
   - `workflow_templates_scope_policy` (SELECT): `COMMUNITY` rows readable by anyone across every tenant; `TENANT` rows readable within the reader's own tenant; `PERSONAL` rows readable only by the owning consultant; Super Admin sees everything.
   - `workflow_templates_write_policy` (INSERT): always tied to the caller's own `tenant_id` + `consultant_id`, regardless of the `scope` being written.
   - `workflow_templates_update_policy` (UPDATE): owning consultant only (or Super Admin).
3. Add `SET LOCAL app.consultant_id` to `withTenantContext()` in `packages/db/src/rls-context.ts`, alongside the existing `app.tenant_id`/`app.is_super_admin` — the first table in the schema that needs a consultant-level RLS boundary rather than router-level enforcement.
4. Apply the standard tenant-isolation RLS policy (schema §4.1) to `workflows` and `workflow_runs` — no exceptions needed on those two.
5. Build `workflow-templates.router.ts`: scope-aware list (accepts a `scope` query param — `PERSONAL`/`TENANT`/`COMMUNITY` — filtering is just the RLS policy doing its job, no bespoke logic needed), create, update, soft-delete. Scope changes are only permitted by the owning consultant.
6. Build `template-render.service.ts`: walks a template's Tiptap JSON, resolves `mention` nodes (merge fields like `client.name`, `appointment.time`) against a `workflow_runs.context` object, and serializes to HTML (for `EMAIL`) or plain text (for `SMS`/`WHATSAPP`) — one Tiptap document, two renderers.
7. Add `WorkflowNodeType`, `WorkflowNodeData`, `WorkflowGraph`, and `WorkflowTemplateScope` to `packages/types/src/workflow.ts`, plus a `zod` discriminated union per node type in `packages/types/src/workflow-node-configs.ts` — shared contract between the canvas (Sprint 5.5.3) and the engine (Sprint 5.5.4), and used server-side to validate a saved graph.

### Sprint 5.5.2: Tiptap Template Editor & Library

1. Install the open-source Tiptap dependencies in `apps/web`: `@tiptap/react`, `@tiptap/core`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-placeholder`, `@tiptap/extension-mention` + `@tiptap/suggestion`, `@tiptap/extension-table` (+`-row`/`-cell`/`-header`), `@tiptap/extension-image`, `@tiptap/extension-link` — deliberately staying inside Tiptap's free extension set, not the paid Pro/Cloud tier.
2. Build `templates/page.tsx`: scope-filterable library list — **My Templates** (`PERSONAL`), **Tenant** (`TENANT`), **Community** (`COMMUNITY`) tabs mapping directly onto `workflow_templates.scope`. Each row shows a scope badge, the owning consultant's name (for shared rows), and a channel icon. Edit/delete affordances are hidden for rows the caller doesn't own — the database-level `workflow_templates_update_policy` is the real enforcement, the UI just mirrors it.
3. Build `templates/[templateId]/page.tsx`: `useEditor` with `StarterKit`, `Mention` (suggestion list sourced from a fixed merge-field registry — `client.*`, `appointment.*`, `consultant.*`), `Table`, `Image`, `Link`, `Placeholder`. Slash-command (`/`) merge-field insertion via `@tiptap/suggestion`, matching the mention UX Carepatron uses for template variables.
4. Add a channel selector — `EMAIL` shows a subject field; `SMS`/`WHATSAPP` enforce a character-count warning, since Tiptap's rich formatting doesn't carry over to those channels.
5. Add the **scope selector** (`PERSONAL` / `TENANT` / `COMMUNITY`), defaulting to `PERSONAL` — a deliberate, visible three-option control ("Only me" / "Everyone at [tenant]" / "Everyone on the platform"), not a hidden default, since it changes who can see the content. Only the owning consultant can change it.
6. Wire autosave to `workflow-templates.router.ts` on blur/debounce, matching the offline-safe note-draft buffering pattern already planned for interaction notes (Phase 5).

### Sprint 5.5.3: `react-jsonschema-form` Dynamic Forms

**Why a separate tool from Tiptap**: message templates are prose with embedded merge-fields; forms need real inputs — text, select, checkbox, date, file, repeatable groups — plus validation and conditional visibility ("show Q5 only if Q3 = Yes"). Tiptap's `Mention` extension can't express that. `react-jsonschema-form` (rjsf) renders a form directly from a JSON Schema + UI Schema pair, which lets form definitions share the same `zod`-based source of truth already used for workflow node configs (`zod-to-json-schema` converts a `zod` schema to the JSON Schema rjsf consumes), keeping one validation contract instead of two.

1. Migrate `form_templates` and `form_submissions` into `packages/db/prisma/schema.prisma` as schema §3.29–3.30 — tenant-scoped, soft-deletable, same pattern as `workflow_templates`.
   - `form_templates`: `scope` (`template_scope` enum, reused from Sprint 5.5.1 — `PERSONAL`/`TENANT`/`COMMUNITY`), `json_schema` (jsonb), `ui_schema` (jsonb), `channel` (`INTERNAL` for consultant-facing use, `CLIENT_LINK` for an unauthenticated client-facing form).
   - `form_submissions`: `form_template_id`, `case_id` (nullable — a form can be filled out before a case exists, e.g. pre-booking intake), `submitted_by` (`CLIENT`/`CONSULTANT`/`ANONYMOUS`), `answers` (jsonb), `submitted_at`.
2. Apply the same `form_templates_scope_policy` / `_write_policy` / `_update_policy` RLS pattern from Sprint 5.5.1 to `form_templates` (verbatim reuse — same three-way scope split, same consultant-ownership rule). Apply the standard tenant-isolation policy to `form_submissions`.
3. Install `@rjsf/core`, `@rjsf/utils`, `@rjsf/validator-ajv8` in `apps/web` — the free, MIT-licensed rjsf packages; no paid tier exists for rjsf itself.
4. Build a thin custom theme (`packages/ui/src/rjsf-theme/`) mapping rjsf's field/widget/template slots onto the existing shadcn/Tailwind primitives already used elsewhere in `apps/web` — rjsf ships official themes for Bootstrap/Material/Antd/Chakra/Fluent/Semantic but not shadcn, so this is a one-time adapter layer, not a fork.
5. Build `form-templates.router.ts`: scope-aware list/create/update/soft-delete, mirroring `workflow-templates.router.ts` exactly (same query-param filtering, same ownership rule on scope changes).
6. Build `forms/page.tsx`: scope-filterable library list (**My Forms** / **Tenant** / **Community**), same layout convention as `templates/page.tsx`.
7. Build `forms/[formTemplateId]/page.tsx` — the form **builder**: a split view — left panel is a palette of field types (short text, long text, number, date, select, multi-select, checkbox, file upload, repeatable group), right panel is a live rjsf preview rendered from the schema being built. Each field-type addition appends to `json_schema.properties` and a matching `ui_schema` entry; conditional visibility rules use JSON Schema's `if`/`then`/`else` composition, which rjsf supports natively.
8. Add the same **scope selector** (`PERSONAL`/`TENANT`/`COMMUNITY`) and the same **channel selector** concept as templates — `INTERNAL` (consultant fills it out during/after a session, e.g. an assessment) vs. `CLIENT_LINK` (generates an unauthenticated, unguessable link for a client to fill out, matching the existing `calendar_sync_token` pattern for unauthenticated-but-unguessable access).
9. Build `form-render.service.ts`: given a `form_templates` row and a `form_submissions.answers` payload, validates the payload against the schema with `ajv8` (the same validator rjsf uses client-side, run again server-side so a submission can never bypass validation by hitting the API directly) and merges the validated answers into a `workflow_runs.context` object under a `form` key — so a downstream `CONDITION` node can branch on an answer (e.g. `form.painLevel > 7`) the same way it already branches on appointment/client context.
10. Build `apps/web/.../f/[submissionToken]/page.tsx`: the unauthenticated client-facing form-fill page for `CLIENT_LINK` forms — token-based like the `.ics` calendar feed, resolved server-side to the `form_templates` row, rendered via the same rjsf theme, `POST`s to a public (token-gated, not JWT-gated) `form-submissions.router.ts` endpoint.
11. Wire autosave-on-blur for the builder itself (not the client-fill page — a client filling out an intake form should submit explicitly, not silently autosave partial answers into a case record).

### Sprint 5.5.4: xyflow Canvas

1. Install the open-source canvas dependencies in `apps/web`: `@xyflow/react`, `dagre` (auto-layout), `zustand` (graph state).
2. Build `workflows/page.tsx`: list view — name, status, trigger type, last run.
3. Build `workflows.router.ts`: CRUD on `workflows`, plus publish/pause/archive (maps to `workflows.status`).
4. Build `[workflowId]/page.tsx`: `ReactFlowProvider` wrapping a `ReactFlow` canvas with custom node components per `WorkflowNodeType` (`TRIGGER`, `SEND_EMAIL`, `SEND_SMS`, `SEND_WHATSAPP`, `SEND_FORM`, `CREATE_TASK`, `CREATE_COMMITMENT`, `WAIT`, `CONDITION`, `BRANCH`).
   - `SEND_FORM` is the new node type from Sprint 5.5.3: dispatches a `CLIENT_LINK` form to the client on whichever channel the node's config specifies, generating a fresh `submissionToken` per `workflow_runs` instance so a resumed/retried run doesn't reuse a stale link.
   - `FORM_SUBMITTED` is added to the `TRIGGER` node's event-type options (alongside `APPOINTMENT_BOOKED` etc.) so a workflow can _start_ when a client completes a given `form_templates` — e.g. a completed intake form kicking off an onboarding sequence.
5. Left sidebar: draggable node palette, now including the `SEND_FORM` node under the same section as `SEND_EMAIL`/`SEND_SMS`/`SEND_WHATSAPP`. Right panel: opens on node click, renders a `react-hook-form` + `zod` config form matching that node's schema — e.g. the `SEND_EMAIL` node's form lets the consultant pick a `workflow_templates` row, scoped by the same Personal/Tenant/Community filtering as the library page; the `SEND_FORM` node's form lets the consultant pick a `form_templates` row the same way.
6. Add the `dagre` auto-layout button for tidying a manually-dragged graph.
7. Wire the save action: serialize `getNodes()`/`getEdges()` to the `WorkflowGraph` shape, `PATCH` to `workflows.router.ts`.

### Sprint 5.5.5: Execution Engine (`pgmq` on Supabase)

1. Enable the `pgmq` extension on Supabase — either Database → Extensions in the dashboard, or a tracked migration: `CREATE EXTENSION IF NOT EXISTS pgmq;` followed by `SELECT pgmq.create('workflow-advance');`. No Redis, no separate queue service — it runs on the Postgres already provisioned.
2. Build `queue/pgmq.ts`: thin wrapper functions (`enqueue`, `dequeue`, `ack`) around the `pgmq.send`/`pgmq.read`/`pgmq.delete` SQL functions, called through the existing Prisma client singleton with `$queryRaw` — no separate connection config.
3. Build `workflow.handler.ts` and a small polling worker (started alongside the Express server) that calls `dequeue()` on an interval and invokes the handler for each message.
4. Build `workflow-engine.service.ts` — the core loop: load the `workflow_runs` row + parent `workflows.graph`; find `current_node_id` (or the trigger node on a fresh run); execute that node's handler:
   - `SEND_*` renders via `template-render.service.ts` then dispatches via `resend.ts`/`twilio.ts`.
   - `SEND_FORM` mints a `submissionToken`, renders the form-link message via `template-render.service.ts` (a small fixed wrapper template, not a full `form_templates` render), dispatches it, then sets `status = WAITING_ON_FORM` with no `resume_at` — this run stays parked until the `form-submissions.router.ts` `POST` handler (Sprint 5.5.3, step 10) explicitly re-enqueues it, rather than polling.
   - `WAIT` sets `status = WAITING` with a `resume_at`.
   - `CONDITION`/`BRANCH` evaluates against `context` (including the `context.form` object populated by a prior `SEND_FORM`/`FORM_SUBMITTED` step) and follows the matching edge.
   - `CREATE_TASK`/`CREATE_COMMITMENT` calls the existing routers' logic service-level so RLS/tenant context is respected.
   - Walk to the next node or mark `COMPLETED`. On success, `ack()`; on failure, leave the message unacked for visibility-timeout-based redelivery, and `pgmq.archive()` once attempts are exhausted.
5. Build `workflow-triggers.ts` cron: sweeps `SCHEDULE`-type workflows on their configured cadence, and re-enqueues any `WAITING` run whose `resume_at` has passed. `WAITING_ON_FORM` runs are explicitly excluded from this sweep since they resume on submission, not on a timer.
6. Wire `EVENT`-type triggers into the relevant existing write paths (e.g. `appointments.router.ts` enqueues a run on `APPOINTMENT_BOOKED`; `form-submissions.router.ts` enqueues/resumes a run on submission for both `FORM_SUBMITTED`-triggered fresh runs and `WAITING_ON_FORM` resumes) — confirm the specific event list before starting this step.

### Sprint 5.5.6: Run History & Polish

1. Build `workflow-runs.router.ts`: list/inspect run history, manual retry on a `FAILED` run.
2. Build `runs/page.tsx`: per-workflow run history, filterable by status — include `WAITING_ON_FORM` as a distinct filterable status alongside `WAITING`/`FAILED`/`COMPLETED`, since a run stuck waiting on a client who never fills out a form is an operationally different problem than a run stuck on a retry.
3. Manual-retry action on failed runs, surfaced directly from the runs list. Add a manual "resend form link" action on `WAITING_ON_FORM` runs, reusing the `SEND_FORM` handler with a freshly minted token rather than the original (expired) one.
4. Polish pass: `dagre` auto-layout refinement, node palette icon/UX pass, config-panel form polish, rjsf theme visual polish (spacing/typography parity with the Tiptap editor so the two authoring surfaces feel like one product).
5. If the `COMMUNITY`-scope moderation question (flagged during Sprint 5.5.1 planning) was resolved as "yes, moderate" — add the `status` column gating `COMMUNITY` visibility until Super Admin approval, applied identically to `workflow_templates` and `form_templates`; otherwise, confirm self-publish stays as specified and close out the open decision.
