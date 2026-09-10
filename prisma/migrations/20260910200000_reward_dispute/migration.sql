-- Player can flag a granted reward as never received; staff follow up
ALTER TABLE "Reward" ADD COLUMN IF NOT EXISTS "disputedAt" TIMESTAMP(3);
