"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
const node_crypto_1 = require("node:crypto");
class AppError extends Error {
    constructor(statusCode, message, code = "INTERNAL_ERROR") {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
    }
}
exports.AppError = AppError;
// Error envelope per data_api_v4.md §2: { error: { code, message, correlationId } }.
// Generic 500 body in production (§1.6) — full detail only ever goes to
// console.error server-side, never back to the caller.
const errorHandler = (err, req, res, next) => {
    console.error(err);
    const correlationId = (0, node_crypto_1.randomUUID)();
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: { code: err.code, message: err.message, correlationId },
        });
    }
    res.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Internal server error", correlationId },
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map