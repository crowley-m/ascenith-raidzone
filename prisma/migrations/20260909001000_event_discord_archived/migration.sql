-- Track when an event's Discord space was archived
ALTER TABLE "Event" ADD COLUMN "discordArchivedAt" TIMESTAMP(3);
