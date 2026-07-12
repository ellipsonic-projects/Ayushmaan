import "dotenv/config";
import express from "express";
import cors from "cors";
import { consultantRouter } from "./routes/consultants";
import { appointmentRouter } from "./routes/appointments";
import { availabilityRouter } from "./routes/availability";
import { clientRouter } from "./routes/clients";
import { meRouter } from "./routes/me";
import { errorHandler } from "./middleware/errorHandler";
import { authMiddleware } from "./middleware/auth";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check — must stay ahead of authMiddleware; load balancers/uptime
// checks hit this with no token.
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Public routes
// apps/api has no credential routes of its own — apps/web talks to Supabase
// Auth directly (data_api_v4.md §1.1/§3). This process only verifies tokens
// it's handed and, via /api/auth/me below, reads the caller's own profile.
app.use("/api/consultants", consultantRouter);

// Protected routes
app.use(authMiddleware);
app.use("/api/auth", meRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/availability", availabilityRouter);
app.use("/api/clients", clientRouter);

// Error handling
app.use(errorHandler);

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`API server running on port ${PORT}`);
});
