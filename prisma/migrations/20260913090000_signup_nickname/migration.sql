-- Optional per-event display name override, separate from the profile's character name
ALTER TABLE "EventSignup" ADD COLUMN IF NOT EXISTS "nickname" TEXT;
