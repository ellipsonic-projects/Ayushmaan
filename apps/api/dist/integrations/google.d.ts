import type { Prisma } from "@ayushman/db";
export declare function buildGoogleAuthUrl(state: string): string;
export declare function exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    scope: string;
}>;
interface ConnectionTokenFields {
    id: string;
    accessTokenEnc: string;
    refreshTokenEnc: string;
    tokenExpiresAt: Date;
}
export declare function getValidAccessToken(connection: ConnectionTokenFields, tx: Prisma.TransactionClient): Promise<string>;
export declare function revokeToken(refreshToken: string): Promise<void>;
export declare function getGmailProfile(accessToken: string): Promise<{
    emailAddress: string;
}>;
export interface ThreadSummary {
    id: string;
    from: string;
    subject: string;
    snippet: string;
    date: string;
    unread: boolean;
}
export declare function listThreads(accessToken: string, maxResults?: number): Promise<ThreadSummary[]>;
export interface ThreadMessage {
    id: string;
    from: string;
    to: string;
    date: string;
    subject: string;
    html: string;
    text: string;
}
export declare function getThread(accessToken: string, threadId: string): Promise<ThreadMessage[]>;
export interface SendMailInput {
    fromEmail: string;
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    html: string;
}
export declare function sendMessage(accessToken: string, input: SendMailInput): Promise<void>;
export {};
//# sourceMappingURL=google.d.ts.map