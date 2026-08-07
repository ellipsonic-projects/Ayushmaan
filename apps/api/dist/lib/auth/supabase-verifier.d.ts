import type { AuthIdentity, AuthVerifier } from "./types";
export declare class SupabaseAuthVerifier implements AuthVerifier {
    verifyToken(token: string): Promise<AuthIdentity | null>;
}
//# sourceMappingURL=supabase-verifier.d.ts.map