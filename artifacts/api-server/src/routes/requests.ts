import { Router } from "express";
import { db } from "@workspace/db";
import { requestsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { CreateRequestBody, UpdateRequestStatusBody } from "@workspace/api-zod";

const router = Router();

// GET /requests — own for employee, all for admin
router.get("/requests", requireAuth, async (req, res) => {
  const auth = (req as any).auth;

  const baseQuery = db
    .select({
      id: requestsTable.id,
      userId: requestsTable.userId,
      userName: usersTable.name,
      type: requestsTable.type,
      reason: requestsTable.reason,
      status: requestsTable.status,
      createdAt: requestsTable.createdAt,
    })
    .from(requestsTable)
    .leftJoin(usersTable, eq(requestsTable.userId, usersTable.id))
    .orderBy(desc(requestsTable.createdAt));

  let rows;
  if (auth.role === "admin") {
    rows = await baseQuery;
  } else {
    rows = await db
      .select({
        id: requestsTable.id,
        userId: requestsTable.userId,
        userName: usersTable.name,
        type: requestsTable.type,
        reason: requestsTable.reason,
        status: requestsTable.status,
        createdAt: requestsTable.createdAt,
      })
      .from(requestsTable)
      .leftJoin(usersTable, eq(requestsTable.userId, usersTable.id))
      .where(eq(requestsTable.userId, auth.userId))
      .orderBy(desc(requestsTable.createdAt));
  }

  res.json(rows.map(r => ({ ...r, userName: r.userName ?? "Unknown" })));
});

// POST /requests
router.post("/requests", requireAuth, async (req, res) => {
  const parsed = CreateRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const auth = (req as any).auth;
  const [row] = await db.insert(requestsTable).values({
    userId: auth.userId,
    type: parsed.data.type as "time_off" | "equipment" | "remote_work" | "other",
    reason: parsed.data.reason,
    status: "pending",
  }).returning();

  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, auth.userId));
  res.status(201).json({ ...row, userName: user?.name ?? "Unknown" });
});

// PATCH /requests/:id/status — admin only
router.patch("/requests/:id/status", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const parsed = UpdateRequestStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [row] = await db
    .update(requestsTable)
    .set({ status: parsed.data.status as "approved" | "denied" })
    .where(eq(requestsTable.id, id))
    .returning();

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [user] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, row.userId));
  res.json({ ...row, userName: user?.name ?? "Unknown" });
});

export default router;
