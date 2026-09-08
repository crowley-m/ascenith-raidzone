-- Everyone is active on registration now; no manual approval step.
ALTER TABLE "Player" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
UPDATE "Player" SET "status" = 'ACTIVE' WHERE "status" = 'PENDING';

-- Reward can point at an uploaded proof image (kept alongside proofImageUrl).
ALTER TABLE "Reward" ADD COLUMN "proofImageId" TEXT;

-- Image uploads live in the DB (no upload volume); served via /api/media/[id].
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "contentType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "caption" TEXT,
    "tag" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MediaAsset_kind_sortOrder_idx" ON "MediaAsset"("kind", "sortOrder");

ALTER TABLE "Reward" ADD CONSTRAINT "Reward_proofImageId_fkey" FOREIGN KEY ("proofImageId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
