import { Router } from "express";
import { db } from "@workspace/db";
import { announcementsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { CreateAnnouncementBody } from "@workspace/api-zod";

const router = Router();

// GET /announcements
router.get("/announcements", requireAuth, async (_req, res) => {
  const rows = await db
    .select({
      id: announcementsTable.id,
      title: announcementsTable.title,
      content: announcementsTable.content,
      authorId: announcementsTable.authorId,
      authorName: usersTable.name,
      createdAt: announcementsTable.createdAt,
    })
    .from(announcementsTable)
    .leftJoin(usersTable, eq(announcementsTable.authorId, usersTable.id))
    .orderBy(desc(announcementsTable.createdAt));

  res.json(rows.map(r => ({
    ...r,
    authorName: r.authorName ?? "Unknown",
  })));
});

// POST /announcements — admin only
router.post("/announcements", requireAuth, requireAdmin, async (req, res) => {
  const parsed = CreateAnnouncementBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const auth = (req as any).auth;
  const [row] = await db.insert(announcementsTable).values({
    title: parsed.data.title,
    content: parsed.data.content,
    authorId: auth.userId,
  }).returning();

  const [author] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, auth.userId));
  res.status(201).json({
    ...row,
    authorName: author?.name ?? "Unknown",
  });
});

// GET /announcements/:id
router.get("/announcements/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db
    .select({
      id: announcementsTable.id,
      title: announcementsTable.title,
      content: announcementsTable.content,
      authorId: announcementsTable.authorId,
      authorName: usersTable.name,
      createdAt: announcementsTable.createdAt,
    })
    .from(announcementsTable)
    .leftJoin(usersTable, eq(announcementsTable.authorId, usersTable.id))
    .where(eq(announcementsTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ...row, authorName: row.authorName ?? "Unknown" });
});

// DELETE /announcements/:id — admin only
router.delete("/announcements/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(announcementsTable).where(eq(announcementsTable.id, id));
  res.status(204).end();
});

export default router;
