-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "bonusText" TEXT,
ADD COLUMN     "detailsMd" TEXT,
ADD COLUMN     "mode" TEXT,
ADD COLUMN     "raidWindow" TEXT,
ADD COLUMN     "rewardTiers" JSONB,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "wipeCycle" TEXT;

