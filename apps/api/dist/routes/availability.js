"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.availabilityRouter = void 0;
const express_1 = require("express");
const supabase_js_1 = require("@supabase/supabase-js");
const zod_1 = require("zod");
exports.availabilityRouter = (0, express_1.Router)();
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || "", process.env.SUPABASE_ANON_KEY || "");
// Get my availability windows (protected)
exports.availabilityRouter.get("/my", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("availability_windows")
            .select("*")
            .eq("user_id", req.user?.id)
            .order("day_of_week");
        if (error)
            throw error;
        res.json({
            data: data || [],
            message: "Your availability windows",
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch availability" });
    }
});
// Get consultant availability windows (public)
exports.availabilityRouter.get("/:consultantId", async (req, res) => {
    try {
        const { consultantId } = req.params;
        const { data, error } = await supabase
            .from("availability_windows")
            .select("*")
            .eq("user_id", consultantId)
            .order("day_of_week");
        if (error)
            throw error;
        res.json({
            data: data || [],
            message: "Availability windows",
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch availability" });
    }
});
// Create availability window (consultant only)
exports.availabilityRouter.post("/", async (req, res) => {
    try {
        const schema = zod_1.z.object({
            dayOfWeek: zod_1.z.number().min(0).max(6),
            startTime: zod_1.z.string(),
            endTime: zod_1.z.string(),
        });
        const data = schema.parse(req.body);
        const { data: result, error } = await supabase
            .from("availability_windows")
            .insert([
            {
                user_id: req.user?.id,
                day_of_week: data.dayOfWeek,
                start_time: data.startTime,
                end_time: data.endTime,
            },
        ])
            .select();
        if (error)
            throw error;
        res.status(201).json({
            data: result?.[0],
            message: "Availability window created",
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to create availability" });
    }
});
// Delete availability window
exports.availabilityRouter.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from("availability_windows")
            .delete()
            .eq("id", id)
            .eq("user_id", req.user?.id);
        if (error)
            throw error;
        res.json({
            message: "Availability window deleted",
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to delete availability" });
    }
});
// Get my blackout dates (protected)
exports.availabilityRouter.get("/my/blackout", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("blackout_dates")
            .select("*")
            .eq("user_id", req.user?.id)
            .order("start_date");
        if (error)
            throw error;
        res.json({
            data: data || [],
            message: "Your blackout dates",
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch blackout dates" });
    }
});
// Get consultant blackout dates
exports.availabilityRouter.get("/:consultantId/blackout", async (req, res) => {
    try {
        const { consultantId } = req.params;
        const { data, error } = await supabase
            .from("blackout_dates")
            .select("*")
            .eq("user_id", consultantId)
            .order("start_date");
        if (error)
            throw error;
        res.json({
            data: data || [],
            message: "Blackout dates",
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch blackout dates" });
    }
});
// Add blackout date
exports.availabilityRouter.post("/:consultantId/blackout", async (req, res) => {
    try {
        const schema = zod_1.z.object({
            startDate: zod_1.z.string(),
            endDate: zod_1.z.string(),
            reason: zod_1.z.string().optional(),
        });
        const data = schema.parse(req.body);
        const { data: result, error } = await supabase
            .from("blackout_dates")
            .insert([
            {
                user_id: req.user?.id,
                start_date: data.startDate,
                end_date: data.endDate,
                reason: data.reason,
            },
        ])
            .select();
        if (error)
            throw error;
        res.status(201).json({
            data: result?.[0],
            message: "Blackout date added",
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to add blackout date" });
    }
});
// Get available slots for booking
exports.availabilityRouter.post("/:consultantId/slots", async (req, res) => {
    try {
        const { consultantId } = req.params;
        const { startDate, endDate } = req.query;
        // Fetch availability windows and blackout dates
        const [availabilityRes, blackoutRes] = await Promise.all([
            supabase
                .from("availability_windows")
                .select("*")
                .eq("user_id", consultantId),
            supabase
                .from("blackout_dates")
                .select("*")
                .eq("user_id", consultantId)
                .gte("end_date", startDate)
                .lte("start_date", endDate),
        ]);
        const slots = [];
        // TODO: Generate available slots based on availability windows and blackout dates
        // This would involve complex date/time calculations
        res.json({
            data: slots,
            message: "Available slots",
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch available slots" });
    }
});
//# sourceMappingURL=availability.js.map