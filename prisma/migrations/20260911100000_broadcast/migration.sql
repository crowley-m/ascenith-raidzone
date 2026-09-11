-- Track server-wide broadcasts (channel + message id) so they can be edited/deleted
CREATE TABLE "Broadcast" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "asEmbed" BOOLEAN NOT NULL DEFAULT false,
    "mentionEveryone" BOOLEAN NOT NULL DEFAULT false,
    "postedById" TEXT NOT NULL,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Broadcast_postedAt_idx" ON "Broadcast"("postedAt");

ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_postedById_fkey"
  FOREIGN KEY ("postedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
