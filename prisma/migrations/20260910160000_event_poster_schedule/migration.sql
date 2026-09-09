-- Event key art + day-by-day schedule
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "posterUrl" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "scheduleMd" TEXT;
