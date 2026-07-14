import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

// createBrowserClient (not the plain supabase-js client) stores the session
// in cookies rather than localStorage, so middleware.ts can read it on the
// server for tenant/status enforcement (PRD_v3 §7.3).
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
