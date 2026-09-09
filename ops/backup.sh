#!/usr/bin/env bash
# ASCENITH RAIDZONE — nightly Postgres backup.
# Dumps the whole DB (schema + data, images included) to a gzipped file and
# keeps the last N. Run from cron on the VPS:
#   0 3 * * * /opt/ascenith/backup.sh >> /opt/ascenith/backup.log 2>&1
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/backups"
KEEP=14
STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$OUT/ascenith-$STAMP.sql.gz"

mkdir -p "$OUT"

echo "[$(date -Is)] dumping -> $FILE"
docker compose -f "$DIR/docker-compose.yml" exec -T db \
  pg_dump -U ascenith -d ascenith --clean --if-exists \
  | gzip -9 > "$FILE.tmp"
mv "$FILE.tmp" "$FILE"

SIZE="$(du -h "$FILE" | cut -f1)"
echo "[$(date -Is)] wrote $SIZE"

# rotate — keep the newest $KEEP
ls -1t "$OUT"/ascenith-*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do
  echo "[$(date -Is)] pruning $old"
  rm -f "$old"
done

# sanity: fail loudly if the dump is suspiciously small (<1 KB = broken)
if [ "$(stat -c%s "$FILE")" -lt 1024 ]; then
  echo "[$(date -Is)] ERROR: backup looks empty" >&2
  exit 1
fi

echo "[$(date -Is)] ok"
