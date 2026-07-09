"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = require("./routes/auth");
const consultants_1 = require("./routes/consultants");
const appointments_1 = require("./routes/appointments");
const availability_1 = require("./routes/availability");
const clients_1 = require("./routes/clients");
const errorHandler_1 = require("./middleware/errorHandler");
const auth_2 = require("./middleware/auth");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Public routes
app.use("/api/auth", auth_1.authRouter);
app.use("/api/consultants", consultants_1.consultantRouter);
// Protected routes
app.use(auth_2.authMiddleware);
app.use("/api/appointments", appointments_1.appointmentRouter);
app.use("/api/availability", availability_1.availabilityRouter);
app.use("/api/clients", clients_1.clientRouter);
// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});
// Error handling
app.use(errorHandler_1.errorHandler);
app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`API server running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map