import { createHmac, timingSafeEqual } from "node:crypto";

// Signs the OAuth `state` param round-tripped through Google so
// google-oauth-callback.router.ts (which runs ahead of authMiddleware, with
// no bearer token available — see index.ts) can recover which user
// initiated the connect, and where to redirect them back to (apps/web has
// three separate inbox pages — admin/consultant/client — so the return path
// is baked in here rather than re-derived on the failure path too) without
// trusting an unauthenticated request.
const STATE_TTL_MS = 10 * 60 * 1000;

function sign(payload: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createOAuthState(userId: string, returnPath: string): string {
  const payload = `${userId}:${encodeURIComponent(returnPath)}:${Date.now() + STATE_TTL_MS}`;
  const signature = sign(payload);
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

export function verifyOAuthState(state: string): { userId: string; returnPath: string } | null {
  let decoded: string;
  try {
    decoded = Buffer.from(state, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const parts = decoded.split(":");
  if (parts.length !== 4) return null;
  const [userId, returnPathEncoded, expiresAtRaw, signature] = parts;

  const payload = `${userId}:${returnPathEncoded}:${expiresAtRaw}`;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  return { userId, returnPath: decodeURIComponent(returnPathEncoded) };
}
