import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { AuthProvider, AuthSession } from "./types";

function toAuthSession(session: Session | null): AuthSession | null {
  if (!session?.user) return null;
  return {
    accessToken: session.access_token,
    user: { id: session.user.id, email: session.user.email ?? "" },
  };
}

export class SupabaseAuthProvider implements AuthProvider {
  async getSession(): Promise<AuthSession | null> {
    const { data } = await supabase.auth.getSession();
    return toAuthSession(data.session);
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(toAuthSession(session));
    });
    return () => subscription.subscription.unsubscribe();
  }

  async signInWithPassword(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    const session = toAuthSession(data.session);
    if (!session) throw new Error("Sign in succeeded but no session was returned");
    return session;
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }
}
