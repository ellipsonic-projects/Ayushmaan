import { randomUUID } from "node:crypto";
import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = "INTERNAL_ERROR"
  ) {
    super(message);
  }
}

// Error envelope per data_api_v4.md §2: { error: { code, message, correlationId } }.
// Generic 500 body in production (§1.6) — full detail only ever goes to
// console.error server-side, never back to the caller.
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);
  const correlationId = randomUUID();

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, correlationId },
    });
  }

  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Internal server error", correlationId },
  });
};
