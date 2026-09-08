CREATE TYPE "public"."habit_schedule_type" AS ENUM('DAILY', 'WEEKDAYS', 'WEEKLY_TARGET');--> statement-breakpoint
CREATE TYPE "public"."habit_status" AS ENUM('AVAILABLE', 'UNAVAILABLE');--> statement-breakpoint
CREATE TYPE "public"."habit_target_type" AS ENUM('COUNT', 'DURATION', 'QUANTITY');--> statement-breakpoint
CREATE TYPE "public"."user_habit_status" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "habits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"schedule_type" "habit_schedule_type" NOT NULL,
	"schedule_config" jsonb NOT NULL,
	"target_type" "habit_target_type" NOT NULL,
	"target_value" numeric NOT NULL,
	"target_unit" text NOT NULL,
	"status" "habit_status" DEFAULT 'AVAILABLE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "habits_target_value_positive" CHECK (CAST("habits"."target_value" AS NUMERIC) > 0),
	CONSTRAINT "habits_name_not_empty" CHECK (length(trim("habits"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "user_habits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"habit_id" uuid NOT NULL,
	"status" "user_habit_status" DEFAULT 'ACTIVE' NOT NULL,
	"start_date" timestamp with time zone DEFAULT now() NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "user_habits_sort_order_non_negative" CHECK ("user_habits"."sort_order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "user_habits" ADD CONSTRAINT "user_habits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_habits" ADD CONSTRAINT "user_habits_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "habits_key_unique" ON "habits" USING btree ("key");--> statement-breakpoint
CREATE INDEX "habits_status_idx" ON "habits" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "user_habits_user_habit_unique" ON "user_habits" USING btree ("user_id","habit_id");--> statement-breakpoint
CREATE INDEX "user_habits_user_status_idx" ON "user_habits" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "user_habits_user_sort_order_idx" ON "user_habits" USING btree ("user_id","sort_order");