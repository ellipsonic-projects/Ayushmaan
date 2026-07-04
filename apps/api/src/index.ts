import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth";
import { consultantRouter } from "./routes/consultants";
import { appointmentRouter } from "./routes/appointments";
import { availabilityRouter } from "./routes/availability";
import { clientRouter } from "./routes/clients";
import { errorHandler } from "./middleware/errorHandler";
import { authMiddleware } from "./middleware/auth";


const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Public routes
app.use("/api/auth", authRouter);
app.use("/api/consultants", consultantRouter);

// Protected routes
app.use(authMiddleware);
app.use("/api/appointments", appointmentRouter);
app.use("/api/availability", availabilityRouter);
app.use("/api/clients", clientRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
