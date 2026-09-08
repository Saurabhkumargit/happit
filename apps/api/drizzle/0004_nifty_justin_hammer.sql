CREATE TYPE "public"."habit_schedule_type" AS ENUM('DAILY', 'WEEKDAYS', 'WEEKLY_TARGET');--> statement-breakpoint
CREATE TYPE "public"."habit_status" AS ENUM('ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."habit_target_type" AS ENUM('COUNT', 'DURATION', 'QUANTITY');--> statement-breakpoint
CREATE TABLE "habits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"schedule_type" "habit_schedule_type" NOT NULL,
	"schedule_config" jsonb NOT NULL,
	"target_type" "habit_target_type" NOT NULL,
	"target_value" numeric NOT NULL,
	"target_unit" text,
	"start_date" timestamp with time zone NOT NULL,
	"status" "habit_status" DEFAULT 'ACTIVE' NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "habits_target_value_positive" CHECK (CAST("habits"."target_value" AS NUMERIC) > 0),
	CONSTRAINT "habits_name_not_empty" CHECK (length(trim("habits"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "habits_user_status_idx" ON "habits" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "habits_user_sort_order_idx" ON "habits" USING btree ("user_id","sort_order");