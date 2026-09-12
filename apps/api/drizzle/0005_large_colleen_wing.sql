CREATE TYPE "public"."activity_source" AS ENUM('TIMER', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."activity_unit" AS ENUM('MINUTES', 'SECONDS', 'REPETITIONS', 'PAGES', 'LITERS');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_habit_id" uuid NOT NULL,
	"source" "activity_source" NOT NULL,
	"activity_date" date NOT NULL,
	"duration_seconds" integer,
	"value" numeric,
	"unit" "activity_unit",
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activities_duration_positive" CHECK ("activities"."duration_seconds" IS NULL OR "activities"."duration_seconds" > 0),
	CONSTRAINT "activities_value_positive" CHECK ("activities"."value" IS NULL OR CAST("activities"."value" AS NUMERIC) > 0)
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_habit_id_user_habits_id_fk" FOREIGN KEY ("user_habit_id") REFERENCES "public"."user_habits"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_user_date_idx" ON "activities" USING btree ("user_id","activity_date");--> statement-breakpoint
CREATE INDEX "activities_user_habit_date_idx" ON "activities" USING btree ("user_habit_id","activity_date");