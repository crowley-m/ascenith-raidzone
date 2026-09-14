-- EventSignup/EventAttendance only had eventId-led composite indexes, which
-- Postgres can't use for a playerId-only lookup (leftmost-prefix rule) — the
-- exact query shape a player's roster/attendance history uses.
CREATE INDEX IF NOT EXISTS "EventSignup_playerId_idx" ON "EventSignup"("playerId");
CREATE INDEX IF NOT EXISTS "EventAttendance_playerId_idx" ON "EventAttendance"("playerId");
