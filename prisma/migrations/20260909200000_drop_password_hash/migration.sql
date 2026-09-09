-- Login is Discord-only; the email/password provider is gone.
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordHash";
