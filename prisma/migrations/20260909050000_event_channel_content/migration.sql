-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "announcementMd" TEXT,
ADD COLUMN     "discordSeedMessages" JSONB,
ADD COLUMN     "gameplayMd" TEXT,
ADD COLUMN     "howToJoinMd" TEXT,
ADD COLUMN     "rewardsMd" TEXT,
ADD COLUMN     "wipeInfoMd" TEXT;

