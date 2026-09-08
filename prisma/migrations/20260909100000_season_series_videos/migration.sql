-- Season: add series + slug, move the unique key to (series, number)
ALTER TABLE "Season" ADD COLUMN "series" TEXT NOT NULL DEFAULT 'Duo-Squad Tournament';
ALTER TABLE "Season" ADD COLUMN "slug" TEXT;

-- backfill slugs for existing rows (all Duo-Squad seasons so far)
UPDATE "Season" SET "slug" = 'duo-squad-' || "number" WHERE "slug" IS NULL;

ALTER TABLE "Season" ALTER COLUMN "slug" SET NOT NULL;

DROP INDEX "Season_number_key";
CREATE UNIQUE INDEX "Season_slug_key" ON "Season"("slug");
CREATE UNIQUE INDEX "Season_series_number_key" ON "Season"("series", "number");

-- SeasonVideo
CREATE TABLE "SeasonVideo" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SeasonVideo_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SeasonVideo_seasonId_idx" ON "SeasonVideo"("seasonId");
ALTER TABLE "SeasonVideo" ADD CONSTRAINT "SeasonVideo_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
