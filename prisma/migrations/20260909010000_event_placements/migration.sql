-- CreateTable
CREATE TABLE "EventPlacement" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "teamId" TEXT,
    "playerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventPlacement_eventId_idx" ON "EventPlacement"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventPlacement_eventId_rank_key" ON "EventPlacement"("eventId", "rank");

-- AddForeignKey
ALTER TABLE "EventPlacement" ADD CONSTRAINT "EventPlacement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPlacement" ADD CONSTRAINT "EventPlacement_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPlacement" ADD CONSTRAINT "EventPlacement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

