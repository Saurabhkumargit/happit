DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REMOVED' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_habit_status')) THEN
  ALTER TYPE "public"."user_habit_status" ADD VALUE 'REMOVED';
 END IF;
END $$;