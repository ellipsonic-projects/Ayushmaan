export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// Everything the app needs from an identity provider. Swapping providers
// (Supabase -> Auth0/Clerk/custom) means writing one new class against this
// interface and changing the export in ./index.ts — nothing else in the app
// touches the provider SDK directly.
export interface AuthProvider {
  getSession(): Promise<AuthSession | null>;
  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void;
  signInWithPassword(email: string, password: string): Promise<AuthSession>;
  // Returns null when Supabase requires email confirmation before a session
  // is issued — the caller has an unconfirmed account but no token yet.
  signUpWithPassword(
    email: string,
    password: string,
    metadata?: Record<string, unknown>
  ): Promise<AuthSession | null>;
  // Redirects the browser to Google's consent screen; the provider brings
  // the user back to `redirectTo` with a session already established (same
  // mechanism as OTP/magic-link — see app/auth/callback/page.tsx). Never
  // resolves with a session directly.
  signInWithGoogle(redirectTo: string): Promise<void>;
  // Sprint 1.2 — OTP sign-in via email.
  sendOtp(email: string): Promise<void>;
  verifyOtp(email: string, token: string): Promise<AuthSession>;
  // Re-sends the "confirm your signup" email for an account that already
  // has a session but hasn't confirmed its address yet (see verify-email
  // page — TENANT_ADMIN accounts are gated on this).
  resendSignupEmail(email: string): Promise<void>;
  signOut(): Promise<void>;
}
