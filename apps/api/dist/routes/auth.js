"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const errorHandler_1 = require("../middleware/errorHandler");
exports.authRouter = (0, express_1.Router)();
// In-memory store for demo (replace with database)
const users = new Map();
const sessions = new Map();
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    firstName: zod_1.z.string(),
    lastName: zod_1.z.string(),
    userType: zod_1.z.enum(["consultant", "client"]),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
exports.authRouter.post("/register", async (req, res) => {
    try {
        const data = registerSchema.parse(req.body);
        if (users.has(data.email)) {
            throw new errorHandler_1.AppError(400, "Email already registered");
        }
        const passwordHash = await bcryptjs_1.default.hash(data.password, 10);
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
        const token = jsonwebtoken_1.default.sign({ id: userId, email: data.email, role: data.userType }, process.env.JWT_SECRET || "your-secret-key", { expiresIn: "7d" });
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        if (error instanceof errorHandler_1.AppError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        res.status(500).json({ error: "Registration failed" });
    }
});
exports.authRouter.post("/login", async (req, res) => {
    try {
        const data = loginSchema.parse(req.body);
        const user = users.get(data.email);
        if (!user) {
            throw new errorHandler_1.AppError(401, "Invalid credentials");
        }
        const passwordMatch = await bcryptjs_1.default.compare(data.password, user.passwordHash);
        if (!passwordMatch) {
            throw new errorHandler_1.AppError(401, "Invalid credentials");
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.userType }, process.env.JWT_SECRET || "your-secret-key", { expiresIn: "7d" });
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
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        if (error instanceof errorHandler_1.AppError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        res.status(500).json({ error: "Login failed" });
    }
});
exports.authRouter.post("/refresh", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: "No token provided" });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "your-secret-key");
        const newToken = jsonwebtoken_1.default.sign(decoded, process.env.JWT_SECRET || "your-secret-key", {
            expiresIn: "7d",
        });
        res.json({ token: newToken });
    }
    catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
});
//# sourceMappingURL=auth.js.map