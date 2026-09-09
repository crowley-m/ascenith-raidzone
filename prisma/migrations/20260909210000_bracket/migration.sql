-- Single-elimination tournament bracket, one per event

CREATE TABLE "Bracket" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Bracket_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Bracket_eventId_key" ON "Bracket"("eventId");
ALTER TABLE "Bracket" ADD CONSTRAINT "Bracket_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "BracketMatch" (
    "id" TEXT NOT NULL,
    "bracketId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "aRef" TEXT,
    "bRef" TEXT,
    "winner" TEXT,
    "aScore" INTEGER,
    "bScore" INTEGER,
    "nextMatchId" TEXT,
    "nextSlot" TEXT,
    CONSTRAINT "BracketMatch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BracketMatch_bracketId_round_position_key" ON "BracketMatch"("bracketId", "round", "position");
CREATE INDEX "BracketMatch_bracketId_idx" ON "BracketMatch"("bracketId");
ALTER TABLE "BracketMatch" ADD CONSTRAINT "BracketMatch_bracketId_fkey"
    FOREIGN KEY ("bracketId") REFERENCES "Bracket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
