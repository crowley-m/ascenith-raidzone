-- Per-event choice of which Discord channels to create on first build
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "discordChannelPlan" JSONB;
