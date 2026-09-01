import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const systemChecks = pgTable("system_checks", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
});