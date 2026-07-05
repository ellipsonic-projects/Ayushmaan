import { Router, Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const appointmentRouter: Router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

// Get user's appointments
appointmentRouter.get("/", async (req: AuthenticatedRequest, res: Response) => {
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

    if (error) throw error;

    res.json({
      data: data || [],
      message: "User appointments",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// Create appointment
appointmentRouter.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const schema = z.object({
      consultantId: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      title: z.string(),
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

    if (error) throw error;

    res.status(201).json({
      data: result?.[0],
      message: "Appointment created",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create appointment" });
  }
});

// Get appointment by ID
appointmentRouter.get(
  "/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          consultant:consultant_id(id, first_name, last_name),
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
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch appointment" });
    }
  }
);

// Update appointment
appointmentRouter.put(
  "/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const schema = z.object({
        title: z.string().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        status: z
          .enum(["scheduled", "confirmed", "completed", "cancelled"])
          .optional(),
      });

      const data = schema.parse(req.body);

      const updateData: any = {};
      if (data.title) updateData.title = data.title;
      if (data.startTime) updateData.start_time = data.startTime;
      if (data.endTime) updateData.end_time = data.endTime;
      if (data.status) updateData.status = data.status;

      const { data: result, error } = await supabase
        .from("appointments")
        .update(updateData)
        .eq("id", id)
        .select();

      if (error) throw error;

      res.json({
        data: result?.[0],
        message: "Appointment updated",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to update appointment" });
    }
  }
);

// Cancel appointment
appointmentRouter.post(
  "/:id/cancel",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from("appointments")
        .update({ status: "cancelled" })
        .eq("id", id)
        .select();

      if (error) throw error;

      res.json({
        data: data?.[0],
        message: "Appointment cancelled",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel appointment" });
    }
  }
);

// Get appointment session logs
appointmentRouter.get(
  "/:id/sessions",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const { data, error } = await supabase
        .from("session_logs")
        .select("*")
        .eq("appointment_id", id)
        .order("created_at");

      if (error) throw error;

      res.json({
        data: data || [],
        message: "Session logs",
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch session logs" });
    }
  }
);
