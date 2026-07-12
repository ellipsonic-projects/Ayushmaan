export interface AuthIdentity {
    providerId: string;
    email: string;
}
export interface AuthVerifier {
    verifyToken(token: string): Promise<AuthIdentity | null>;
}
//# sourceMappingURL=types.d.ts.map