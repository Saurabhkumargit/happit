import { sql } from "drizzle-orm";

import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  numeric,
  jsonb,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";

export const habitScheduleTypeEnum = pgEnum("habit_schedule_type", [
  "DAILY",
  "WEEKDAYS",
  "WEEKLY_TARGET",
]);

export const habitTargetTypeEnum = pgEnum("habit_target_type", [
  "COUNT",
  "DURATION",
  "QUANTITY",
]);

export const habitStatusEnum = pgEnum("habit_status", ["ACTIVE", "ARCHIVED"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    email: text("email").notNull(),

    passwordHash: text("password_hash").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailUniqueIndex: uniqueIndex("users_email_unique").on(table.email),
  }),
);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),

  expiresAt: timestamp("expires_at", {
    withTimezone: true,
  }).notNull(),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export const habits = pgTable(
  "habits",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    name: text("name").notNull(),

    description: text("description"),

    scheduleType: habitScheduleTypeEnum("schedule_type").notNull(),

    scheduleConfig: jsonb("schedule_config").notNull(),

    targetType: habitTargetTypeEnum("target_type").notNull(),

    targetValue: numeric("target_value").notNull(),

    targetUnit: text("target_unit"),

    startDate: timestamp("start_date", {
      withTimezone: true,
    }).notNull(),

    status: habitStatusEnum("status").notNull().default("ACTIVE"),

    sortOrder: integer("sort_order").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    archivedAt: timestamp("archived_at", {
      withTimezone: true,
    }),
  },
  (table) => ({
    userStatusIndex: index("habits_user_status_idx").on(
      table.userId,
      table.status,
    ),

    userSortOrderIndex: index("habits_user_sort_order_idx").on(
      table.userId,
      table.sortOrder,
    ),

    targetValuePositiveCheck: check(
      "habits_target_value_positive",
      sql`CAST(${table.targetValue} AS NUMERIC) > 0`,
    ),

    nameNotEmptyCheck: check(
      "habits_name_not_empty",
      sql`length(trim(${table.name})) > 0`,
    ),
  }),
);
