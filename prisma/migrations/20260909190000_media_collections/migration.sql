-- Staff-made titled image sections for the Winners page
CREATE TABLE "MediaCollection" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaCollection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MediaCollection_slug_key" ON "MediaCollection"("slug");
CREATE INDEX "MediaCollection_sortOrder_idx" ON "MediaCollection"("sortOrder");
