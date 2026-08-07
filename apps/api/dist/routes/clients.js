"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientRouter = void 0;
const express_1 = require("express");
exports.clientRouter = (0, express_1.Router)();
// Get client profile
exports.clientRouter.get("/profile", (req, res) => {
    res.json({
        data: null,
        message: "Client profile",
    });
});
// Update client profile
exports.clientRouter.put("/profile", (req, res) => {
    res.json({
        data: null,
        message: "Client profile updated",
    });
});
// Get client appointments
exports.clientRouter.get("/appointments", (req, res) => {
    res.json({
        data: [],
        message: "Client appointments",
    });
});
// Submit review for appointment
exports.clientRouter.post("/reviews", (req, res) => {
    res.status(201).json({
        data: null,
        message: "Review submitted",
    });
});
// Get client notifications
exports.clientRouter.get("/notifications", (req, res) => {
    res.json({
        data: [],
        message: "Notifications",
    });
});
// Mark notification as read
exports.clientRouter.put("/notifications/:notificationId", (req, res) => {
    res.json({
        message: "Notification marked as read",
    });
});
//# sourceMappingURL=clients.js.map