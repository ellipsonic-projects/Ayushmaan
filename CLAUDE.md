@AGENTS.md

# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

## 5. Never run the dev server by yourself

** Ask me to run the dev server manually if needed.**

## 6. Always describe the error or the root cause of the problem to the user

** Describe the error when you see one before editing it**

## 7. Refer to @/packages/db/prisma/schema.prisma for reference of the database schema

## Project Overview

- A single personal system where every Consultant has a timeline around his clients — a chronological log of every case which comprises of interactions, commitments, supporting documents, tasks, and notes which are either written or audio transcribed.
- A nextjs project with an easy to use UI with minimized clicks to every feature and supports desktop and mobile screens

## Tech stack

- Next.js, React, TypeScript, Tailwind CSS, Prisma, PostgreSQL, Supabase, Turborepo, pnpm, Radix UI, Tiptap, Zod, SWR, React Flow (@xyflow/react), ESLint, Prettier, Husky , Huggingface models, Node-Cron, Twilio

## Hard Constraints

- All database queries must be written in prisma ORM
- There are four roles SUPER_ADMIN, TENANT_ADMIN, CONSULTANT, CLIENT with different scope levels

## Topic Docs

- API Design Patterns (`docs/api-patterns.md`) — Required reading when adding endpoints
- Database Rules (`docs/database-rules.md`) — Required when modifying database operations
- Schema details (`docs/schema-details.md`) -
  Required when writing server side logic for each api
- Project folder structure (`docs/project-structure.md`) -
  Required to follow project folder structure
- Sprints (`docs/sprints.md`) -
  Required to develop project in phases

- Do not change the hero section of Landing page

## Do not change the @packages/db/prisma/schema.prisma

- Give a clear reason telling why you need to change the schema.
- Ask permission from me before changing the schema.

## Always make sure you add the files to the @/supabase/run-policies.sh if any new *.sql files are created in @/supabase/auth-hooks, @/supabase/policies, @/supabase/roles, @/supabase/storage-policies
