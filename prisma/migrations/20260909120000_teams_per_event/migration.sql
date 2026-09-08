-- Teams become event-scoped: a player can lead / be in a different team per
-- event, but only one per event. (No teams exist yet, so no data migration.)

-- drop the old "one team per player / global unique name" constraints
DROP INDEX "Team_leaderId_key";
DROP INDEX "Team_name_key";
DROP INDEX "TeamMember_playerId_key";

-- clear any event-less teams, then require eventId + cascade
DELETE FROM "Team" WHERE "eventId" IS NULL;
ALTER TABLE "Team" DROP CONSTRAINT "Team_eventId_fkey";
ALTER TABLE "Team" ALTER COLUMN "eventId" SET NOT NULL;
ALTER TABLE "Team" ADD CONSTRAINT "Team_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- new constraints
CREATE UNIQUE INDEX "Team_eventId_name_key" ON "Team"("eventId", "name");
CREATE INDEX "Team_leaderId_idx" ON "Team"("leaderId");
CREATE INDEX "Team_eventId_idx" ON "Team"("eventId");
CREATE UNIQUE INDEX "TeamMember_teamId_playerId_key" ON "TeamMember"("teamId", "playerId");
CREATE INDEX "TeamMember_playerId_idx" ON "TeamMember"("playerId");
