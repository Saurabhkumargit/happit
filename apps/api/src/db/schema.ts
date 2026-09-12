import { sql } from "drizzle-orm";

import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  date,
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

export const habitStatusEnum = pgEnum("habit_status", [
  "AVAILABLE",
  "UNAVAILABLE",
]);

export const userHabitStatusEnum = pgEnum("user_habit_status", [
  "ACTIVE",
  "ARCHIVED",
]);

export const activitySourceEnum = pgEnum("activity_source", [
  "TIMER",
  "MANUAL",
]);

export const activityUnitEnum = pgEnum("activity_unit", [
  "MINUTES",
  "SECONDS",
  "REPETITIONS",
  "PAGES",
  "LITERS",
]);

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
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    scheduleType: habitScheduleTypeEnum("schedule_type").notNull(),
    scheduleConfig: jsonb("schedule_config").notNull(),
    targetType: habitTargetTypeEnum("target_type").notNull(),
    targetValue: numeric("target_value").notNull(),
    targetUnit: text("target_unit").notNull(),
    status: habitStatusEnum("status").notNull().default("AVAILABLE"),
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
    keyUniqueIndex: uniqueIndex("habits_key_unique").on(table.key),
    catalogStatusIndex: index("habits_status_idx").on(table.status),
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

export const userHabits = pgTable(
  "user_habits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, {
        onDelete: "restrict",
      }),
    status: userHabitStatusEnum("status").notNull().default("ACTIVE"),
    startDate: timestamp("start_date", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
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
    userHabitUniqueIndex: uniqueIndex(
      "user_habits_user_habit_unique",
    ).on(table.userId, table.habitId),
    userStatusIndex: index("user_habits_user_status_idx").on(
      table.userId,
      table.status,
    ),
    userSortOrderIndex: index("user_habits_user_sort_order_idx").on(
      table.userId,
      table.sortOrder,
    ),
    sortOrderNonNegativeCheck: check(
      "user_habits_sort_order_non_negative",
      sql`${table.sortOrder} >= 0`,
    ),
  }),
);

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),

    userHabitId: uuid("user_habit_id")
      .notNull()
      .references(() => userHabits.id, {
        onDelete: "restrict",
      }),

    source: activitySourceEnum("source").notNull(),

    activityDate: date("activity_date").notNull(),

    durationSeconds: integer("duration_seconds"),

    value: numeric("value"),

    unit: activityUnitEnum("unit"),

    startedAt: timestamp("started_at", {
      withTimezone: true,
    }),

    endedAt: timestamp("ended_at", {
      withTimezone: true,
    }),

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
    userDateIndex: index("activities_user_date_idx").on(
      table.userId,
      table.activityDate,
    ),

    userHabitDateIndex: index("activities_user_habit_date_idx").on(
      table.userHabitId,
      table.activityDate,
    ),

    durationPositiveCheck: check(
      "activities_duration_positive",
      sql`${table.durationSeconds} IS NULL OR ${table.durationSeconds} > 0`,
    ),

    valuePositiveCheck: check(
      "activities_value_positive",
      sql`${table.value} IS NULL OR CAST(${table.value} AS NUMERIC) > 0`,
    ),
  }),
);
