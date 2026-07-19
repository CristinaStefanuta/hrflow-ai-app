import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, requestsTable, timeEntriesTable } from "@workspace/db";
import { eq, and, gte, lte, count, ne } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { startOfWeek, endOfWeek, startOfDay, endOfDay, eachDayOfInterval, format, addDays } from "date-fns";
import { computeWorkedMinutes, computeCurrentStatus } from "./timeEntries";

const router = Router();

// GET /analytics/employee-stats
router.get("/analytics/employee-stats", requireAuth, async (req, res) => {
  const auth = (req as any).auth;
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Weekly time entries
  const weekEntries = await db
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
  let totalMinutes = 0;
  let workedDays = 0;
  for (const day of days) {
    const dayEntries = weekEntries.filter(e => {
      const d = new Date(e.timestamp);
      return d >= startOfDay(day) && d <= endOfDay(day);
    });
    if (dayEntries.length > 0) {
      const cap = endOfDay(day) < now ? endOfDay(day) : now;
      const mins = computeWorkedMinutes(dayEntries, cap);
      totalMinutes += mins;
      workedDays++;
    }
  }

  // Request breakdown for this user
  const userRequests = await db
    .select({ status: requestsTable.status })
    .from(requestsTable)
    .where(eq(requestsTable.userId, auth.userId));

  const breakdown = { approved: 0, denied: 0, pending: 0 };
  for (const r of userRequests) {
    if (r.status === "approved") breakdown.approved++;
    else if (r.status === "denied") breakdown.denied++;
    else breakdown.pending++;
  }

  res.json({
    weeklyHours: parseFloat((totalMinutes / 60).toFixed(2)),
    avgDailyHours: parseFloat((workedDays > 0 ? totalMinutes / 60 / workedDays : 0).toFixed(2)),
    requestBreakdown: breakdown,
  });
});

// GET /analytics/admin-stats
router.get("/analytics/admin-stats", requireAuth, requireAdmin, async (_req, res) => {
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // Total employees
  const [{ total }] = await db.select({ total: count() }).from(usersTable).where(eq(usersTable.role, "employee"));

  // Active today (have clock_in today without clock_out)
  const allEmployees = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "employee"));

  let activeToday = 0;
  let totalWeeklyMinutes = 0;
  let employeesWithHours = 0;

  for (const emp of allEmployees) {
    const todayEntries = await db
      .select()
      .from(timeEntriesTable)
      .where(
        and(
          eq(timeEntriesTable.userId, emp.id),
          gte(timeEntriesTable.timestamp, dayStart),
          lte(timeEntriesTable.timestamp, dayEnd),
        ),
      )
      .orderBy(timeEntriesTable.timestamp);

    const status = computeCurrentStatus(todayEntries);
    if (status === "clocked_in" || status === "on_pause") activeToday++;

    // Weekly hours
    const weekEntries = await db
      .select()
      .from(timeEntriesTable)
      .where(
        and(
          eq(timeEntriesTable.userId, emp.id),
          gte(timeEntriesTable.timestamp, weekStart),
          lte(timeEntriesTable.timestamp, weekEnd),
        ),
      )
      .orderBy(timeEntriesTable.timestamp);

    if (weekEntries.length > 0) {
      totalWeeklyMinutes += computeWorkedMinutes(weekEntries, now);
      employeesWithHours++;
    }
  }

  // Request breakdown
  const allRequests = await db.select({ status: requestsTable.status }).from(requestsTable);
  const breakdown = { approved: 0, denied: 0, pending: 0 };
  for (const r of allRequests) {
    if (r.status === "approved") breakdown.approved++;
    else if (r.status === "denied") breakdown.denied++;
    else breakdown.pending++;
  }

  res.json({
    activeEmployeesToday: activeToday,
    totalEmployees: Number(total),
    avgOfficeHours: parseFloat((employeesWithHours > 0 ? totalWeeklyMinutes / 60 / employeesWithHours : 0).toFixed(2)),
    pendingRequests: breakdown.pending,
    requestBreakdown: breakdown,
  });
});

// GET /analytics/clock-overview
router.get("/analytics/clock-overview", requireAuth, requireAdmin, async (_req, res) => {
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const employees = await db
    .select({ id: usersTable.id, name: usersTable.name, department: usersTable.department })
    .from(usersTable)
    .where(eq(usersTable.role, "employee"))
    .orderBy(usersTable.name);

  const overview = await Promise.all(employees.map(async (emp) => {
    const todayEntries = await db
      .select()
      .from(timeEntriesTable)
      .where(
        and(
          eq(timeEntriesTable.userId, emp.id),
          gte(timeEntriesTable.timestamp, dayStart),
          lte(timeEntriesTable.timestamp, dayEnd),
        ),
      )
      .orderBy(timeEntriesTable.timestamp);

    const status = computeCurrentStatus(todayEntries);
    const firstClockIn = todayEntries.find(e => e.type === "clock_in");

    return {
      userId: emp.id,
      name: emp.name,
      department: emp.department,
      status,
      clockedInAt: firstClockIn?.timestamp ?? null,
    };
  }));

  res.json(overview);
});

// GET /analytics/shift-plan
router.get("/analytics/shift-plan", requireAuth, async (_req, res) => {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const shiftPlan = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const dateStr = format(day, "yyyy-MM-dd");
    const isWeekend = i >= 5;
    return {
      date: dateStr,
      dayName: dayNames[i],
      plannedStart: isWeekend ? "—" : "09:00",
      plannedEnd: isWeekend ? "—" : "17:00",
      isToday: format(now, "yyyy-MM-dd") === dateStr,
    };
  });

  res.json(shiftPlan);
});

export default router;
