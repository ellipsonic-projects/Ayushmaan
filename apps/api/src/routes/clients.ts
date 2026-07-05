import { Router, Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";

export const clientRouter: Router = Router();

// Get client profile
clientRouter.get("/profile", (req: AuthenticatedRequest, res: Response) => {
  res.json({
    data: null,
    message: "Client profile",
  });
});

// Update client profile
clientRouter.put("/profile", (req: AuthenticatedRequest, res: Response) => {
  res.json({
    data: null,
    message: "Client profile updated",
  });
});

// Get client appointments
clientRouter.get("/appointments", (req: AuthenticatedRequest, res: Response) => {
  res.json({
    data: [],
    message: "Client appointments",
  });
});

// Submit review for appointment
clientRouter.post("/reviews", (req: AuthenticatedRequest, res: Response) => {
  res.status(201).json({
    data: null,
    message: "Review submitted",
  });
});

// Get client notifications
clientRouter.get("/notifications", (req: AuthenticatedRequest, res: Response) => {
  res.json({
    data: [],
    message: "Notifications",
  });
});

// Mark notification as read
clientRouter.put("/notifications/:notificationId", (req: AuthenticatedRequest, res: Response) => {
  res.json({
    message: "Notification marked as read",
  });
});
