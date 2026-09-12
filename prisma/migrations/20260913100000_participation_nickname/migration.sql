-- Snapshot the per-event display name onto the permanent participation record too
ALTER TABLE "EventParticipation" ADD COLUMN IF NOT EXISTS "nickname" TEXT;
