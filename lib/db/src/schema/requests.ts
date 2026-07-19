import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const requestsTable = pgTable("requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["time_off", "equipment", "remote_work", "other"] }).notNull(),
  reason: text("reason").notNull(),
  status: text("status", { enum: ["pending", "approved", "denied"] }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRequestSchema = createInsertSchema(requestsTable).omit({ id: true, createdAt: true, status: true });
export type InsertRequest = z.infer<typeof insertRequestSchema>;
export type HrRequest = typeof requestsTable.$inferSelect;
