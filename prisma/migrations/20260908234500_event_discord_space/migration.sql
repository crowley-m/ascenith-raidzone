-- Event's bot-built Discord category + channel map
ALTER TABLE "Event" ADD COLUMN "discordCategoryId" TEXT,
                    ADD COLUMN "discordChannels" JSONB;
