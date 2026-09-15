-- General-purpose Discord categories/channels staff create from the portal,
-- separate from the per-event space builder.
CREATE TABLE IF NOT EXISTS "DiscordCategory" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscordCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DiscordCategory_discordId_key" ON "DiscordCategory"("discordId");

CREATE TABLE IF NOT EXISTS "DiscordManagedChannel" (
    "id" TEXT NOT NULL,
    "discordId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'text',
    "categoryId" TEXT NOT NULL,
    "roleIds" JSONB NOT NULL DEFAULT '[]',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscordManagedChannel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DiscordManagedChannel_discordId_key" ON "DiscordManagedChannel"("discordId");
CREATE INDEX IF NOT EXISTS "DiscordManagedChannel_categoryId_idx" ON "DiscordManagedChannel"("categoryId");

ALTER TABLE "DiscordCategory" ADD CONSTRAINT "DiscordCategory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DiscordManagedChannel" ADD CONSTRAINT "DiscordManagedChannel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "DiscordCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscordManagedChannel" ADD CONSTRAINT "DiscordManagedChannel_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
