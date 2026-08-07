import { Request, Response, NextFunction } from "express";
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        supabaseAuthUserId: string;
        email: string;
        role: string;
        tenantId: string | null;
        emailIsVerified: boolean;
    };
}
export declare const authMiddleware: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=auth.d.ts.map