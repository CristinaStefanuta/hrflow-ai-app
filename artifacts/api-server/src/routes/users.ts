import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { UpdateUserBody } from "@workspace/api-zod";
import { sanitizeUser } from "./auth";

const router = Router();

// GET /users — admin only
router.get("/users", requireAuth, requireAdmin, async (_req, res) => {
  const users = await db.select().from(usersTable).orderBy(usersTable.name);
  res.json(users.map(sanitizeUser));
});

// GET /users/:id
router.get("/users/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(sanitizeUser(user));
});

// PATCH /users/:id
router.patch("/users/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const auth = (req as any).auth;
  // Can only update own profile (or admin can update any)
  if (auth.userId !== id && auth.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const updates: Record<string, string | null> = {};
  const d = parsed.data;
  if (d.name !== undefined) updates.name = d.name;
  if (d.department !== undefined) updates.department = d.department;
  if (d.phoneNumber !== undefined) updates.phoneNumber = d.phoneNumber;
  if (d.profilePictureUrl !== undefined) updates.profilePictureUrl = d.profilePictureUrl;
  if (d.language !== undefined) updates.language = d.language;
  if (d.shiftPreferences !== undefined) updates.shiftPreferences = d.shiftPreferences;

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(sanitizeUser(user));
});

export default router;
