-- Categories can now carry their own role-based visibility, same shape as
-- DiscordManagedChannel.roleIds.
ALTER TABLE "DiscordCategory" ADD COLUMN IF NOT EXISTS "roleIds" JSONB NOT NULL DEFAULT '[]';
