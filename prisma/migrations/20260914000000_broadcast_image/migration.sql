-- Optional image attached to a broadcast (upload or pasted URL)
ALTER TABLE "Broadcast" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
