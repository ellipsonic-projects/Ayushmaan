"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const consultants_1 = require("./routes/consultants");
const appointments_1 = require("./routes/appointments");
const availability_1 = require("./routes/availability");
const clients_1 = require("./routes/clients");
const me_1 = require("./routes/me");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_1 = require("./middleware/auth");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health check — must stay ahead of authMiddleware; load balancers/uptime
// checks hit this with no token.
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});
// Public routes
// apps/api has no credential routes of its own — apps/web talks to Supabase
// Auth directly (data_api_v4.md §1.1/§3). This process only verifies tokens
// it's handed and, via /api/auth/me below, reads the caller's own profile.
app.use("/api/consultants", consultants_1.consultantRouter);
// Protected routes
app.use(auth_1.authMiddleware);
app.use("/api/auth", me_1.meRouter);
app.use("/api/appointments", appointments_1.appointmentRouter);
app.use("/api/availability", availability_1.availabilityRouter);
app.use("/api/clients", clients_1.clientRouter);
// Error handling
app.use(errorHandler_1.errorHandler);
app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`API server running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map