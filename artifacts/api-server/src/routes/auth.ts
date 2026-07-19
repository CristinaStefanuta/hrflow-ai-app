import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, signToken } from "../middlewares/auth";
import {
  RegisterBody,
  LoginBody,
} from "@workspace/api-zod";

const router = Router();

// POST /auth/register
router.post("/auth/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const { name, email, password, role, department, language } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({
    name,
    email,
    passwordHash,
    role: role as "admin" | "employee",
    department: department ?? null,
    language: (language as "en" | "de") ?? "en",
  }).returning();

  const token = signToken(user.id, user.role);
  res.status(201).json({
    token,
    user: sanitizeUser(user),
  });
});

// POST /auth/login
router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken(user.id, user.role);
  res.json({ token, user: sanitizeUser(user) });
});

// POST /auth/logout
router.post("/auth/logout", (_req, res) => {
  res.json({ ok: true });
});

// GET /auth/me
router.get("/auth/me", requireAuth, async (req, res) => {
  const auth = (req as any).auth;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json(sanitizeUser(user));
});

function sanitizeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    phoneNumber: user.phoneNumber,
    profilePictureUrl: user.profilePictureUrl,
    language: user.language,
    shiftPreferences: user.shiftPreferences,
    createdAt: user.createdAt,
  };
}

export { sanitizeUser };
export default router;
