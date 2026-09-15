-- A channel can opt into following its category's role list — editing the
-- category then cascades to every synced child automatically.
ALTER TABLE "DiscordManagedChannel" ADD COLUMN IF NOT EXISTS "synced" BOOLEAN NOT NULL DEFAULT false;
