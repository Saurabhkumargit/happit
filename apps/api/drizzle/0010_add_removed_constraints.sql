DROP INDEX IF EXISTS "user_habits_user_habit_unique";--> statement-breakpoint
ALTER TABLE "user_habits" ADD COLUMN "removed_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "user_habits_user_habit_unique" ON "user_habits" USING btree ("user_id","habit_id") WHERE "user_habits"."status" != 'REMOVED';
