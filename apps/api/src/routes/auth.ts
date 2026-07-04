import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { AppError } from "../middleware/errorHandler";

export const authRouter = Router();

// In-memory store for demo (replace with database)
const users: Map<string, any> = new Map();
const sessions: Map<string, any> = new Map();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string(),
  lastName: z.string(),
  userType: z.enum(["consultant", "client"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const data = registerSchema.parse(req.body);

    if (users.has(data.email)) {
      throw new AppError(400, "Email already registered");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const userId = crypto.randomUUID();

    const user = {
      id: userId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      userType: data.userType,
      passwordHash,
      createdAt: new Date(),
    };

    users.set(data.email, user);

    const token = jwt.sign(
      { id: userId, email: data.email, role: data.userType },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: "Registration failed" });
  }
});

authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = users.get(data.email);
    if (!user) {
      throw new AppError(401, "Invalid credentials");
    }

    const passwordMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!passwordMatch) {
      throw new AppError(401, "Invalid credentials");
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.userType },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: "Login failed" });
  }
});

authRouter.post("/refresh", (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    const newToken = jwt.sign(decoded, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "7d",
    });
    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});
