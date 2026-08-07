import { SupabaseAuthVerifier } from "./supabase-verifier";
import type { AuthVerifier } from "./types";

// Single point where the active identity provider is chosen. To switch off
// Supabase, implement AuthVerifier (see supabase-verifier.ts for the shape)
// and swap the class instantiated here.
export const authVerifier: AuthVerifier = new SupabaseAuthVerifier();

export type { AuthIdentity, AuthVerifier } from "./types";
