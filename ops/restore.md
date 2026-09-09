# Restore from a backup

Backups are gzipped `pg_dump --clean` files in `/opt/ascenith/backups/`.

## Restore the whole database

```bash
cd /opt/ascenith

# stop the app so nothing writes mid-restore (db keeps running)
docker compose --profile app stop web bot

# pick a file and load it
gunzip -c backups/ascenith-YYYYMMDD-HHMMSS.sql.gz \
  | docker compose exec -T db psql -U ascenith -d ascenith

# bring the app back
docker compose --profile app start web bot
```

The dump is `--clean --if-exists`, so it drops and recreates every table — no
need to reset the volume first.

## Off-site copies

`/opt/ascenith/backups/` is on the same disk as the database. Pull copies down
regularly, e.g. from your machine:

```bash
scp root@<vps>:/opt/ascenith/backups/ascenith-*.sql.gz ./local-backups/
```

or point the cron job's output at a mounted remote / object store.

## Schedule

Installed as a root crontab entry:

```
0 3 * * * /opt/ascenith/backup.sh >> /opt/ascenith/backup.log 2>&1
```

Check it's running: `tail /opt/ascenith/backup.log` and `ls -lh /opt/ascenith/backups/`.
