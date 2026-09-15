-- Swap-based reordering for /portal/discord's categories and channels.
ALTER TABLE "DiscordCategory" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DiscordManagedChannel" ADD COLUMN IF NOT EXISTS "position" INTEGER NOT NULL DEFAULT 0;
