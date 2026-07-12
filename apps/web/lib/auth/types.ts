export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSession {
  accessToken: string;
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
  signOut(): Promise<void>;
}
