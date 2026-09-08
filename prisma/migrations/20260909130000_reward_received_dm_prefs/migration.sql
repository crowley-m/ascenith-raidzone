-- Player: opt-out toggle for Discord DM notifications
ALTER TABLE "Player" ADD COLUMN "dmNotifications" BOOLEAN NOT NULL DEFAULT true;

-- Reward: the player confirms it arrived in-game
ALTER TABLE "Reward" ADD COLUMN "receivedAt" TIMESTAMP(3);
