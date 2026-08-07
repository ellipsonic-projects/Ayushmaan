import { OAuth2Client } from "google-auth-library";
import type { Prisma } from "@ayushman/db";
import { AppError } from "../middleware/errorHandler";
import { decryptToken, encryptToken } from "../lib/token-encryption";

// gmail.readonly covers users.getProfile/threads.list/messages.get; no
// separate userinfo/openid scope is needed since the connected email address
// comes from users.getProfile.
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

function getOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new AppError(500, "Google OAuth is not configured", "GOOGLE_OAUTH_NOT_CONFIGURED");
  }
  return new OAuth2Client({ clientId, clientSecret, redirectUri });
}

export function buildGoogleAuthUrl(state: string): string {
  return getOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const { tokens } = await getOAuthClient().getToken(code);
  if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
    throw new AppError(
      502,
      "Google did not return the expected tokens",
      "GOOGLE_TOKEN_EXCHANGE_FAILED"
    );
  }
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(tokens.expiry_date),
    scope: tokens.scope ?? SCOPES.join(" "),
  };
}

async function refreshAccessToken(refreshToken: string) {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  if (!credentials.access_token || !credentials.expiry_date) {
    throw new AppError(502, "Failed to refresh Google access token", "GOOGLE_TOKEN_REFRESH_FAILED");
  }
  return { accessToken: credentials.access_token, expiresAt: new Date(credentials.expiry_date) };
}

interface ConnectionTokenFields {
  id: string;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  tokenExpiresAt: Date;
}

// Refreshes and persists a new access token if the stored one is at (or
// near) expiry; otherwise just decrypts and returns the cached one.
export async function getValidAccessToken(
  connection: ConnectionTokenFields,
  tx: Prisma.TransactionClient
): Promise<string> {
  const EXPIRY_BUFFER_MS = 60_000;
  if (connection.tokenExpiresAt.getTime() - EXPIRY_BUFFER_MS > Date.now()) {
    return decryptToken(connection.accessTokenEnc);
  }

  const refreshToken = decryptToken(connection.refreshTokenEnc);
  const { accessToken, expiresAt } = await refreshAccessToken(refreshToken);
  await tx.inboxConnection.update({
    where: { id: connection.id },
    data: { accessTokenEnc: encryptToken(accessToken), tokenExpiresAt: expiresAt },
  });
  return accessToken;
}

export async function revokeToken(refreshToken: string): Promise<void> {
  try {
    await getOAuthClient().revokeToken(refreshToken);
  } catch {
    // Best-effort — the connection row is deleted regardless (docs/api-patterns.md
    // §disconnect semantics don't require the remote revoke to succeed).
  }
}

async function gmailFetch<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GMAIL_API_BASE}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new AppError(502, `Gmail API request failed: ${res.status} ${body}`, "GMAIL_API_ERROR");
  }
  return res.json() as Promise<T>;
}

interface GmailMessagePart {
  mimeType: string;
  body?: { data?: string };
  headers?: { name: string; value: string }[];
  parts?: GmailMessagePart[];
}

interface GmailMessage {
  id: string;
  snippet: string;
  labelIds?: string[];
  payload: GmailMessagePart & { headers: { name: string; value: string }[] };
}

interface GmailThread {
  id: string;
  messages: GmailMessage[];
}

export async function getGmailProfile(accessToken: string): Promise<{ emailAddress: string }> {
  return gmailFetch<{ emailAddress: string }>(accessToken, "/profile");
}

function headerValue(headers: { name: string; value: string }[], name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

export interface ThreadSummary {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
}

export async function listThreads(accessToken: string, maxResults = 25): Promise<ThreadSummary[]> {
  const list = await gmailFetch<{ threads?: { id: string }[] }>(
    accessToken,
    `/threads?maxResults=${maxResults}`
  );
  const threads = list.threads ?? [];

  return Promise.all(
    threads.map(async (t) => {
      const thread = await gmailFetch<GmailThread>(
        accessToken,
        `/threads/${t.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`
      );
      const lastMessage = thread.messages[thread.messages.length - 1];
      const headers = lastMessage.payload.headers;
      return {
        id: thread.id,
        from: headerValue(headers, "From"),
        subject: headerValue(headers, "Subject") || "(no subject)",
        snippet: lastMessage.snippet,
        date: headerValue(headers, "Date"),
        unread: (lastMessage.labelIds ?? []).includes("UNREAD"),
      };
    })
  );
}

export interface ThreadMessage {
  id: string;
  from: string;
  to: string;
  date: string;
  subject: string;
  html: string;
  text: string;
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

function extractBody(payload: GmailMessagePart): { html: string; text: string } {
  if (payload.body?.data && payload.parts === undefined) {
    const decoded = decodeBase64Url(payload.body.data);
    return payload.mimeType === "text/html"
      ? { html: decoded, text: "" }
      : { html: "", text: decoded };
  }

  let html = "";
  let text = "";
  for (const part of payload.parts ?? []) {
    if (part.mimeType === "text/html" && part.body?.data) html = decodeBase64Url(part.body.data);
    else if (part.mimeType === "text/plain" && part.body?.data)
      text = decodeBase64Url(part.body.data);
  }
  return { html, text };
}

export async function getThread(accessToken: string, threadId: string): Promise<ThreadMessage[]> {
  const thread = await gmailFetch<GmailThread>(accessToken, `/threads/${threadId}?format=full`);
  return thread.messages.map((message) => {
    const headers = message.payload.headers;
    const { html, text } = extractBody(message.payload);
    return {
      id: message.id,
      from: headerValue(headers, "From"),
      to: headerValue(headers, "To"),
      date: headerValue(headers, "Date"),
      subject: headerValue(headers, "Subject") || "(no subject)",
      html,
      text,
    };
  });
}

export interface SendMailInput {
  fromEmail: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
}

function encodeMimeHeader(value: string): string {
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

export async function sendMessage(accessToken: string, input: SendMailInput): Promise<void> {
  const lines = [
    `From: ${input.fromEmail}`,
    `To: ${input.to}`,
    ...(input.cc ? [`Cc: ${input.cc}`] : []),
    ...(input.bcc ? [`Bcc: ${input.bcc}`] : []),
    `Subject: ${encodeMimeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    input.html,
  ];
  const raw = Buffer.from(lines.join("\r\n"), "utf8").toString("base64url");

  await gmailFetch(accessToken, "/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
}
