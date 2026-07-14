export interface AuthIdentity {
    providerId: string;
    email: string;
    emailVerified: boolean;
}
export interface AuthVerifier {
    verifyToken(token: string): Promise<AuthIdentity | null>;
}
//# sourceMappingURL=types.d.ts.map