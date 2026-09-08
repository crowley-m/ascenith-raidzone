-- Event: ping @everyone when the announcement posts
ALTER TABLE "Event" ADD COLUMN "announcePing" BOOLEAN NOT NULL DEFAULT false;
