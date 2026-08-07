import { SupabaseAuthProvider } from "./supabase-provider";
import type { AuthProvider } from "./types";

// Single point where the active identity provider is chosen. To switch off
// Supabase, implement AuthProvider (see supabase-provider.ts for the shape)
// and swap the class instantiated here.
export const authProvider: AuthProvider = new SupabaseAuthProvider();

export type { AuthProvider, AuthSession, AuthUser } from "./types";
