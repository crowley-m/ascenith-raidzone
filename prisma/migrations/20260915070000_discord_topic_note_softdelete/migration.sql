ALTER TABLE "DiscordCategory" ADD COLUMN IF NOT EXISTS "note" TEXT;
ALTER TABLE "DiscordCategory" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE "DiscordManagedChannel" ADD COLUMN IF NOT EXISTS "topic" TEXT;
ALTER TABLE "DiscordManagedChannel" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "DiscordCategory_deletedAt_idx" ON "DiscordCategory"("deletedAt");
CREATE INDEX IF NOT EXISTS "DiscordManagedChannel_deletedAt_idx" ON "DiscordManagedChannel"("deletedAt");
