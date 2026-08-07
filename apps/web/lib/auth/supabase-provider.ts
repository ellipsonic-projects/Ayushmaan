import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { AuthProvider, AuthSession } from "./types";

function toAuthSession(session: Session | null): AuthSession | null {
  if (!session?.user) return null;
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
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

    const provider = data.user?.app_metadata?.provider;
    if (provider && provider !== "email") {
      await supabase.auth.signOut();
      throw new Error(
        `This account uses ${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in. Please sign in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}.`
      );
    }

    const session = toAuthSession(data.session);
    if (!session) throw new Error("Sign in succeeded but no session was returned");
    return session;
  }

  async signUpWithPassword(
    email: string,
    password: string,
    metadata?: Record<string, unknown>
  ): Promise<AuthSession | null> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      ...(metadata && { options: { data: metadata } }),
    });
    if (error) throw new Error(error.message);
    return toAuthSession(data.session);
  }

  async signInWithGoogle(redirectTo: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) throw new Error(error.message);
  }

  async sendOtp(email: string): Promise<void> {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw new Error(error.message);
  }

  async verifyOtp(email: string, token: string): Promise<AuthSession> {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) throw new Error(error.message);

    const provider = data.user?.app_metadata?.provider;
    if (provider && provider !== "email") {
      await supabase.auth.signOut();
      throw new Error(
        `This account uses ${provider.charAt(0).toUpperCase() + provider.slice(1)} sign-in. Please sign in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}.`
      );
    }

    const session = toAuthSession(data.session);
    if (!session) throw new Error("Verification succeeded but no session was returned");
    return session;
  }

  async resendSignupEmail(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) throw new Error(error.message);
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }
}
