import { Request, Response, NextFunction } from "express";
export declare class AppError extends Error {
    statusCode: number;
    code: string;
    constructor(statusCode: number, message: string, code?: string);
}
export declare const errorHandler: (err: Error | AppError, req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=errorHandler.d.ts.map