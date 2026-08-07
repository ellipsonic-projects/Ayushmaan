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
// server for tenant/status enforcement (PRD_v3 §7.3). Deliberately
// host-only (no cookieOptions.domain): a `.localhost` (or any TLD-less dev
// host) Domain attribute gets silently rejected by the browser's
// registrable-domain check, which drops the cookie write entirely rather
// than just failing to share it. Crossing from the main domain to a
// tenant's subdomain is instead handled by a token handoff — see
// tenantOrigin()/the auth callback pages in lib/auth/destination.ts.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
