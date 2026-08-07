import { Router, Response } from "express";
import { z } from "zod";
import type { Prisma } from "@ayushman/db";
import type { TenantContext } from "@ayushman/db/rls-context";
import { withTenantContext } from "@ayushman/db/rls-context";
import { AuthenticatedRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { createOAuthState } from "../lib/oauth-state";
import { decryptToken } from "../lib/token-encryption";
import { resolveInboxReturnPath } from "../lib/inbox-return-path";
import {
  buildGoogleAuthUrl,
  getValidAccessToken,
  listThreads,
  getThread,
  sendMessage,
  revokeToken,
} from "../integrations/google";

// Mounted at /api/inbox, ahead of tenantContextMiddleware (see index.ts) —
// every role (TENANT_ADMIN, CONSULTANT, CLIENT) connects and manages their
// own Gmail independently, and CLIENT has no tenant to scope a route under.
export const inboxRouter: Router = Router();

function tenantContextFor(req: AuthenticatedRequest): TenantContext {
  return {
    tenantId: req.user!.tenantId,
    isSuperAdmin: req.user!.role === "SUPER_ADMIN",
    userId: req.user!.id,
  };
}

async function findConnection(tx: Prisma.TransactionClient, userId: string) {
  return tx.inboxConnection.findUnique({
    where: { userId_provider: { userId, provider: "GOOGLE" } },
  });
}

async function requireActiveConnection(tx: Prisma.TransactionClient, userId: string) {
  const connection = await findConnection(tx, userId);
  if (!connection || connection.status !== "ACTIVE") {
    throw new AppError(409, "No active inbox connection", "INBOX_NOT_CONNECTED");
  }
  return connection;
}

// GET /inbox/connection
inboxRouter.get("/connection", async (req: AuthenticatedRequest, res: Response) => {
  const connection = await withTenantContext(tenantContextFor(req), (tx) =>
    findConnection(tx, req.user!.id)
  );

  res.json({
    data: connection
      ? {
          connected: connection.status === "ACTIVE",
          emailAddress: connection.emailAddress,
          status: connection.status,
        }
      : { connected: false, emailAddress: null, status: null },
  });
});

// GET /inbox/connect-url — apps/web redirects the full page to this URL;
// apps/web has no backend of its own to proxy through (docs/project-structure.md).
inboxRouter.get("/connect-url", async (req: AuthenticatedRequest, res: Response) => {
  const returnPath = await withTenantContext(tenantContextFor(req), (tx) =>
    resolveInboxReturnPath(tx, req.user!)
  );
  if (!returnPath) {
    throw new AppError(400, "This account can't connect an inbox", "INBOX_UNSUPPORTED_ROLE");
  }

  const state = createOAuthState(req.user!.id, returnPath);
  res.json({ data: { url: buildGoogleAuthUrl(state) } });
});

// DELETE /inbox/connection
inboxRouter.delete("/connection", async (req: AuthenticatedRequest, res: Response) => {
  await withTenantContext(tenantContextFor(req), async (tx) => {
    const connection = await findConnection(tx, req.user!.id);
    if (!connection) throw new AppError(404, "No inbox connected", "INBOX_NOT_CONNECTED");
    await revokeToken(decryptToken(connection.refreshTokenEnc));
    await tx.inboxConnection.delete({ where: { id: connection.id } });
  });
  res.status(204).send();
});

// GET /inbox/threads
inboxRouter.get("/threads", async (req: AuthenticatedRequest, res: Response) => {
  const threads = await withTenantContext(tenantContextFor(req), async (tx) => {
    const connection = await requireActiveConnection(tx, req.user!.id);
    const accessToken = await getValidAccessToken(connection, tx);
    return listThreads(accessToken);
  });
  res.json({ data: threads });
});

// GET /inbox/threads/:threadId
inboxRouter.get("/threads/:threadId", async (req: AuthenticatedRequest, res: Response) => {
  const messages = await withTenantContext(tenantContextFor(req), async (tx) => {
    const connection = await requireActiveConnection(tx, req.user!.id);
    const accessToken = await getValidAccessToken(connection, tx);
    return getThread(accessToken, req.params.threadId);
  });
  res.json({ data: messages });
});

const sendMailSchema = z
  .object({
    to: z.string().min(1),
    cc: z.string().optional(),
    bcc: z.string().optional(),
    subject: z.string().min(1),
    html: z.string(),
  })
  .strict();

// POST /inbox/send
inboxRouter.post("/send", async (req: AuthenticatedRequest, res: Response) => {
  const body = sendMailSchema.parse(req.body);

  await withTenantContext(tenantContextFor(req), async (tx) => {
    const connection = await requireActiveConnection(tx, req.user!.id);
    const accessToken = await getValidAccessToken(connection, tx);
    await sendMessage(accessToken, { fromEmail: connection.emailAddress, ...body });
  });

  res.status(204).send();
});
