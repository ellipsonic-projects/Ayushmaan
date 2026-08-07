export declare function createOAuthState(userId: string, returnPath: string): string;
export declare function verifyOAuthState(state: string): {
    userId: string;
    returnPath: string;
} | null;
//# sourceMappingURL=oauth-state.d.ts.map