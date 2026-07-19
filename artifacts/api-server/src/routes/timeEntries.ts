import { Router } from "express";
import { db } from "@workspace/db";
import { timeEntriesTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { CreateTimeEntryBody } from "@workspace/api-zod";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, format, eachDayOfInterval } from "date-fns";

const router = Router();

// GET /time-entries
router.get("/time-entries", requireAuth, async (req, res) => {
  const auth = (req as any).auth;
  const userId = req.query.userId ? Number(req.query.userId) : null;
  const date = req.query.date ? new Date(req.query.date as string) : null;

  const targetUserId = (auth.role === "admin" && userId) ? userId : auth.userId;

  let conditions = [eq(timeEntriesTable.userId, targetUserId)];

  if (date) {
    conditions.push(gte(timeEntriesTable.timestamp, startOfDay(date)));
    conditions.push(lte(timeEntriesTable.timestamp, endOfDay(date)));
  }

  const entries = await db
    .select()
    .from(timeEntriesTable)
    .where(and(...conditions))
    .orderBy(desc(timeEntriesTable.timestamp));

  res.json(entries);
});

// POST /time-entries
router.post("/time-entries", requireAuth, async (req, res) => {
  const parsed = CreateTimeEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const auth = (req as any).auth;
  const [entry] = await db.insert(timeEntriesTable).values({
    userId: auth.userId,
    type: parsed.data.type as "clock_in" | "clock_out" | "pause_start" | "pause_end",
    timestamp: new Date(),
  }).returning();

  res.status(201).json(entry);
});

// GET /time-entries/current-status
router.get("/time-entries/current-status", requireAuth, async (req, res) => {
  const auth = (req as any).auth;
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const todayEntries = await db
    .select()
    .from(timeEntriesTable)
    .where(
      and(
        eq(timeEntriesTable.userId, auth.userId),
        gte(timeEntriesTable.timestamp, dayStart),
        lte(timeEntriesTable.timestamp, dayEnd),
      ),
    )
    .orderBy(timeEntriesTable.timestamp);

  const workedMinutes = computeWorkedMinutes(todayEntries, now);
  const status = computeCurrentStatus(todayEntries);
  const lastEntry = todayEntries[todayEntries.length - 1];

  res.json({
    status,
    workedMinutesToday: workedMinutes,
    requiredMinutesPerDay: 480,
    lastEntryAt: lastEntry?.timestamp ?? null,
  });
});

// GET /time-entries/weekly-summary
router.get("/time-entries/weekly-summary", requireAuth, async (req, res) => {
  const auth = (req as any).auth;
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const entries = await db
    .select()
    .from(timeEntriesTable)
    .where(
      and(
        eq(timeEntriesTable.userId, auth.userId),
        gte(timeEntriesTable.timestamp, weekStart),
        lte(timeEntriesTable.timestamp, weekEnd),
      ),
    )
    .orderBy(timeEntriesTable.timestamp);

  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const daySummaries = days.map(day => {
    const dayEntries = entries.filter(e => {
      const d = new Date(e.timestamp);
      return d >= startOfDay(day) && d <= endOfDay(day);
    });
    return {
      date: format(day, "yyyy-MM-dd"),
      workedMinutes: computeWorkedMinutes(dayEntries, endOfDay(day) < now ? endOfDay(day) : now),
    };
  });

  res.json({
    weekStart: format(weekStart, "yyyy-MM-dd"),
    weekEnd: format(weekEnd, "yyyy-MM-dd"),
    totalMinutes: daySummaries.reduce((s, d) => s + d.workedMinutes, 0),
    days: daySummaries,
  });
});

function computeCurrentStatus(entries: { type: string }[]): "not_started" | "clocked_in" | "on_pause" | "clocked_out" {
  if (entries.length === 0) return "not_started";
  const last = entries[entries.length - 1];
  if (last.type === "clock_in") return "clocked_in";
  if (last.type === "clock_out") return "clocked_out";
  if (last.type === "pause_start") return "on_pause";
  if (last.type === "pause_end") return "clocked_in";
  return "not_started";
}

function computeWorkedMinutes(entries: { type: string; timestamp: Date | string }[], now: Date): number {
  let minutes = 0;
  let clockInAt: Date | null = null;
  let pauseAt: Date | null = null;

  for (const entry of entries) {
    const ts = new Date(entry.timestamp);
    if (entry.type === "clock_in" || entry.type === "pause_end") {
      clockInAt = ts;
      pauseAt = null;
    } else if (entry.type === "pause_start") {
      if (clockInAt) {
        minutes += (ts.getTime() - clockInAt.getTime()) / 60000;
        clockInAt = null;
        pauseAt = ts;
      }
    } else if (entry.type === "clock_out") {
      if (clockInAt) {
        minutes += (ts.getTime() - clockInAt.getTime()) / 60000;
        clockInAt = null;
      }
    }
  }
  // If still clocked in, count up to now
  if (clockInAt) {
    minutes += (now.getTime() - clockInAt.getTime()) / 60000;
  }
  return Math.round(minutes);
}

export { computeWorkedMinutes, computeCurrentStatus };
export default router;
