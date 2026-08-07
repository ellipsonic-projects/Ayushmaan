import { supabaseAdmin } from "../supabaseAdmin";
import type { AuthIdentity, AuthVerifier } from "./types";

export class SupabaseAuthVerifier implements AuthVerifier {
  async verifyToken(token: string): Promise<AuthIdentity | null> {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) return null;

    const provider: string | undefined = data.user.app_metadata?.provider;
    const isSocialAuth = provider != null && provider !== "email";

    return {
      providerId: data.user.id,
      email: data.user.email ?? "",
      emailVerified: isSocialAuth || !!data.user.email_confirmed_at,
    };
  }
}
