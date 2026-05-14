#!/bin/bash
# indica-ai-backup — daily Postgres dump for Indica AÍ!
#
# Runs from cron as root. Dumps the indica_ai database from the Swarm
# Postgres container, gzips it, and keeps the last 14 days.
#
# Failures get appended to /var/log/indica-ai-backup.log; if any command
# fails the whole script exits non-zero so cron can surface it.
set -euo pipefail

BACKUP_DIR="/var/backups/indica-ai"
RETENTION_DAYS=14
DB_NAME="indica_ai"
DB_USER="indica"
LOG_FILE="/var/log/indica-ai-backup.log"

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "[$(ts)] $*" | tee -a "$LOG_FILE"; }

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

stamp=$(date -u +"%Y-%m-%d_%H%M%S")
out="$BACKUP_DIR/indica_ai-$stamp.sql.gz"

# Find the running DB container (Swarm task id is volatile, so match by name prefix).
container=$(docker ps --filter "name=indica-ai_indica-ai-db" --format "{{.Names}}" | head -1)
if [ -z "$container" ]; then
  log "ERROR: no indica-ai-db container running"
  exit 1
fi

log "starting backup from $container -> $out"

# pg_dump runs inside the container (postgres is on the indica-internal
# network only, not reachable from the host). gzip on the host side so
# the resulting file is always compressed even if the container's gzip
# moves around.
if ! docker exec "$container" pg_dump -U "$DB_USER" --clean --if-exists --no-owner "$DB_NAME" | gzip > "$out"; then
  log "ERROR: pg_dump failed for $container"
  rm -f "$out"
  exit 1
fi

chmod 600 "$out"
size=$(stat -c %s "$out")
log "backup ok: $out ($size bytes)"

# Sanity check: gzip should be valid and the dump should contain the
# CREATE TABLE for at least one core table.
if ! gzip -t "$out" 2>/dev/null; then
  log "ERROR: $out is not a valid gzip — aborting"
  exit 1
fi
if ! gzip -dc "$out" | grep -q "CREATE TABLE.*tenants"; then
  log "ERROR: $out does not contain the tenants table — aborting"
  exit 1
fi
log "backup verified"

# Retention: delete dumps older than RETENTION_DAYS days.
deleted=$(find "$BACKUP_DIR" -name "indica_ai-*.sql.gz" -type f -mtime +$RETENTION_DAYS -print -delete | wc -l)
log "retention sweep: removed $deleted file(s) older than ${RETENTION_DAYS}d"
