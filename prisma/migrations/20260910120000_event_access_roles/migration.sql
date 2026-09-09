-- Per-event Discord access role + per-team voice role/channel + participation log

ALTER TABLE "Event" ADD COLUMN "discordRoleId" TEXT;

ALTER TABLE "Team" ADD COLUMN "discordRoleId" TEXT;
ALTER TABLE "Team" ADD COLUMN "discordVoiceChannelId" TEXT;

CREATE TABLE "EventParticipation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT,
    "playerId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventMode" TEXT,
    "playedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventParticipation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EventParticipation_eventId_playerId_key" ON "EventParticipation"("eventId", "playerId");
CREATE INDEX "EventParticipation_playerId_idx" ON "EventParticipation"("playerId");
ALTER TABLE "EventParticipation" ADD CONSTRAINT "EventParticipation_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventParticipation" ADD CONSTRAINT "EventParticipation_playerId_fkey"
    FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
