"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGoogleAuthUrl = buildGoogleAuthUrl;
exports.exchangeCodeForTokens = exchangeCodeForTokens;
exports.getValidAccessToken = getValidAccessToken;
exports.revokeToken = revokeToken;
exports.getGmailProfile = getGmailProfile;
exports.listThreads = listThreads;
exports.getThread = getThread;
exports.sendMessage = sendMessage;
const google_auth_library_1 = require("google-auth-library");
const errorHandler_1 = require("../middleware/errorHandler");
const token_encryption_1 = require("../lib/token-encryption");
// gmail.readonly covers users.getProfile/threads.list/messages.get; no
// separate userinfo/openid scope is needed since the connected email address
// comes from users.getProfile.
const SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
];
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
function getOAuthClient() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) {
        throw new errorHandler_1.AppError(500, "Google OAuth is not configured", "GOOGLE_OAUTH_NOT_CONFIGURED");
    }
    return new google_auth_library_1.OAuth2Client({ clientId, clientSecret, redirectUri });
}
function buildGoogleAuthUrl(state) {
    return getOAuthClient().generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: SCOPES,
        state,
    });
}
async function exchangeCodeForTokens(code) {
    const { tokens } = await getOAuthClient().getToken(code);
    if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
        throw new errorHandler_1.AppError(502, "Google did not return the expected tokens", "GOOGLE_TOKEN_EXCHANGE_FAILED");
    }
    return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expiry_date),
        scope: tokens.scope ?? SCOPES.join(" "),
    };
}
async function refreshAccessToken(refreshToken) {
    const client = getOAuthClient();
    client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await client.refreshAccessToken();
    if (!credentials.access_token || !credentials.expiry_date) {
        throw new errorHandler_1.AppError(502, "Failed to refresh Google access token", "GOOGLE_TOKEN_REFRESH_FAILED");
    }
    return { accessToken: credentials.access_token, expiresAt: new Date(credentials.expiry_date) };
}
// Refreshes and persists a new access token if the stored one is at (or
// near) expiry; otherwise just decrypts and returns the cached one.
async function getValidAccessToken(connection, tx) {
    const EXPIRY_BUFFER_MS = 60000;
    if (connection.tokenExpiresAt.getTime() - EXPIRY_BUFFER_MS > Date.now()) {
        return (0, token_encryption_1.decryptToken)(connection.accessTokenEnc);
    }
    const refreshToken = (0, token_encryption_1.decryptToken)(connection.refreshTokenEnc);
    const { accessToken, expiresAt } = await refreshAccessToken(refreshToken);
    await tx.inboxConnection.update({
        where: { id: connection.id },
        data: { accessTokenEnc: (0, token_encryption_1.encryptToken)(accessToken), tokenExpiresAt: expiresAt },
    });
    return accessToken;
}
async function revokeToken(refreshToken) {
    try {
        await getOAuthClient().revokeToken(refreshToken);
    }
    catch {
        // Best-effort — the connection row is deleted regardless (docs/api-patterns.md
        // §disconnect semantics don't require the remote revoke to succeed).
    }
}
async function gmailFetch(accessToken, path, init) {
    const res = await fetch(`${GMAIL_API_BASE}${path}`, {
        ...init,
        headers: { ...init?.headers, Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
        const body = await res.text();
        throw new errorHandler_1.AppError(502, `Gmail API request failed: ${res.status} ${body}`, "GMAIL_API_ERROR");
    }
    return res.json();
}
async function getGmailProfile(accessToken) {
    return gmailFetch(accessToken, "/profile");
}
function headerValue(headers, name) {
    return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}
async function listThreads(accessToken, maxResults = 25) {
    const list = await gmailFetch(accessToken, `/threads?maxResults=${maxResults}`);
    const threads = list.threads ?? [];
    return Promise.all(threads.map(async (t) => {
        const thread = await gmailFetch(accessToken, `/threads/${t.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`);
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
    }));
}
function decodeBase64Url(data) {
    return Buffer.from(data, "base64url").toString("utf8");
}
function extractBody(payload) {
    if (payload.body?.data && payload.parts === undefined) {
        const decoded = decodeBase64Url(payload.body.data);
        return payload.mimeType === "text/html"
            ? { html: decoded, text: "" }
            : { html: "", text: decoded };
    }
    let html = "";
    let text = "";
    for (const part of payload.parts ?? []) {
        if (part.mimeType === "text/html" && part.body?.data)
            html = decodeBase64Url(part.body.data);
        else if (part.mimeType === "text/plain" && part.body?.data)
            text = decodeBase64Url(part.body.data);
    }
    return { html, text };
}
async function getThread(accessToken, threadId) {
    const thread = await gmailFetch(accessToken, `/threads/${threadId}?format=full`);
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
function encodeMimeHeader(value) {
    return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}
async function sendMessage(accessToken, input) {
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
//# sourceMappingURL=google.js.map