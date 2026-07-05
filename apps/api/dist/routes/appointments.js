"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentRouter = void 0;
const express_1 = require("express");
const supabase_js_1 = require("@supabase/supabase-js");
const zod_1 = require("zod");
exports.appointmentRouter = (0, express_1.Router)();
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL || "", process.env.SUPABASE_ANON_KEY || "");
// Get user's appointments
exports.appointmentRouter.get("/", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("appointments")
            .select(`
        *,
        consultant:consultant_id(first_name, last_name),
        client:client_id(first_name, last_name)
      `)
            .or(`consultant_id.eq.${req.user?.id},client_id.eq.${req.user?.id}`)
            .order("start_time", { ascending: false });
        if (error)
            throw error;
        res.json({
            data: data || [],
            message: "User appointments",
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch appointments" });
    }
});
// Create appointment
exports.appointmentRouter.post("/", async (req, res) => {
    try {
        const schema = zod_1.z.object({
            consultantId: zod_1.z.string(),
            startTime: zod_1.z.string(),
            endTime: zod_1.z.string(),
            title: zod_1.z.string(),
        });
        const data = schema.parse(req.body);
        const { data: result, error } = await supabase
            .from("appointments")
            .insert([
            {
                consultant_id: data.consultantId,
                client_id: req.user?.id,
                start_time: data.startTime,
                end_time: data.endTime,
                title: data.title,
                status: "scheduled",
            },
        ])
            .select();
        if (error)
            throw error;
        res.status(201).json({
            data: result?.[0],
            message: "Appointment created",
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to create appointment" });
    }
});
// Get appointment by ID
exports.appointmentRouter.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from("appointments")
            .select(`
          *,
          consultant:consultant_id(first_name, last_name),
          client:client_id(first_name, last_name)
        `)
            .eq("id", id)
            .single();
        if (error || !data) {
            return res.status(404).json({
                data: null,
                message: "Appointment not found",
            });
        }
        res.json({
            data,
            message: "Appointment",
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch appointment" });
    }
});
// Update appointment
exports.appointmentRouter.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const schema = zod_1.z.object({
            title: zod_1.z.string().optional(),
            startTime: zod_1.z.string().optional(),
            endTime: zod_1.z.string().optional(),
            status: zod_1.z
                .enum(["scheduled", "confirmed", "completed", "cancelled"])
                .optional(),
        });
        const data = schema.parse(req.body);
        const updateData = {};
        if (data.title)
            updateData.title = data.title;
        if (data.startTime)
            updateData.start_time = data.startTime;
        if (data.endTime)
            updateData.end_time = data.endTime;
        if (data.status)
            updateData.status = data.status;
        const { data: result, error } = await supabase
            .from("appointments")
            .update(updateData)
            .eq("id", id)
            .select();
        if (error)
            throw error;
        res.json({
            data: result?.[0],
            message: "Appointment updated",
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to update appointment" });
    }
});
// Cancel appointment
exports.appointmentRouter.post("/:id/cancel", async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from("appointments")
            .update({ status: "cancelled" })
            .eq("id", id)
            .select();
        if (error)
            throw error;
        res.json({
            data: data?.[0],
            message: "Appointment cancelled",
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to cancel appointment" });
    }
});
// Get appointment session logs
exports.appointmentRouter.get("/:id/sessions", async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from("session_logs")
            .select("*")
            .eq("appointment_id", id)
            .order("created_at");
        if (error)
            throw error;
        res.json({
            data: data || [],
            message: "Session logs",
        });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch session logs" });
    }
});
//# sourceMappingURL=appointments.js.map