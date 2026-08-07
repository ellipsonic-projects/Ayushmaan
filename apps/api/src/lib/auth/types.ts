// Identity claims decoded from a caller's access token, independent of
// which provider issued it.
export interface AuthIdentity {
  providerId: string;
  email: string;
  emailVerified: boolean;
}

// Everything apps/api needs from an identity provider: turn a bearer token
// into claims. To switch providers, implement this against the new SDK (see
// supabase-verifier.ts for the shape) and swap the export in ./index.ts.
export interface AuthVerifier {
  verifyToken(token: string): Promise<AuthIdentity | null>;
}
