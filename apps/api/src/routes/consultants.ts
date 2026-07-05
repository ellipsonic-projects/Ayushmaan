import { Router, Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { AppError } from "../middleware/errorHandler";

export const consultantRouter: Router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

// Get all public consultant profiles (public listing)
consultantRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select(`
        id,
        first_name,
        last_name,
        email,
        profiles (
          bio,
          title,
          hourly_rate,
          timezone,
          specialties,
          average_rating,
          total_reviews,
          profile_image_url
        )
      `)
      .eq("user_type", "consultant")
      .eq("is_active", true);

    if (error) throw error;

    const consultants = data?.map((user: any) => ({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      ...user.profiles[0],
    })) || [];

    res.json({
      data: consultants,
      message: "List of public consultant profiles",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch consultants" });
  }
});

// Get consultant by ID (public profile)
consultantRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("users")
      .select(`
        id,
        first_name,
        last_name,
        email,
        profiles (
          bio,
          title,
          hourly_rate,
          timezone,
          specialties,
          average_rating,
          total_reviews,
          profile_image_url
        )
      `)
      .eq("id", id)
      .eq("user_type", "consultant")
      .single();

    if (error || !data) {
      return res.status(404).json({
        data: null,
        message: "Consultant profile not found",
      });
    }

    const consultant = {
      id: data.id,
      name: `${data.first_name} ${data.last_name}`,
      email: data.email,
      ...data.profiles,
    };

    res.json({
      data: consultant,
      message: "Consultant profile",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch consultant" });
  }
});

// Get consultant credentials
consultantRouter.get("/:id/credentials", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("credentials")
      .select("*")
      .eq("user_id", id);

    if (error) throw error;

    res.json({
      data: data || [],
      message: "Consultant credentials",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch credentials" });
  }
});

// Get consultant reviews
consultantRouter.get("/:id/reviews", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("consultant_id", id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({
      data: data || [],
      message: "Consultant reviews",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});
