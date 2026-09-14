-- Short "looking for a team" blurb a free agent can leave for team leaders
-- browsing the free-agent list.
ALTER TABLE "EventSignup" ADD COLUMN IF NOT EXISTS "lfgNote" TEXT;
