-- Event: ping @everyone in every event channel, not just the announcement
ALTER TABLE "Event" ADD COLUMN "announcePingAll" BOOLEAN NOT NULL DEFAULT false;
