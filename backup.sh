#!/bin/bash
# TikTok AI Factory — Production Backup Script
# Usage: ./backup.sh           (database only)
#        ./backup.sh --full    (database + source code)
set -euo pipefail

# Resolve script directory regardless of where the script is called from
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/backups"
CONTAINER="tiktok-vf-db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30
FULL_BACKUP=false

# Load credentials from .env (must exist)
if [[ -f "${SCRIPT_DIR}/.env" ]]; then
  set -a; source "${SCRIPT_DIR}/.env"; set +a
fi

# Require essential env vars — refuse to run if missing
if [[ -z "${DB_USER:-}" || -z "${DB_PASSWORD:-}" || -z "${DB_NAME:-}" ]]; then
  echo "❌ Missing DB_USER, DB_PASSWORD, or DB_NAME in environment or .env"
  exit 1
fi

if [[ "${1:-}" == "--full" ]]; then
  FULL_BACKUP=true
fi

mkdir -p "$BACKUP_DIR"

# ── Database Backup (via Docker container) ─────────────────────────────────

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting database backup..."
DUMP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"

if docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl > "$DUMP_FILE" 2>/dev/null; then
  DUMP_SIZE=$(wc -c < "$DUMP_FILE")
  echo "  ✅ Database dump: $DUMP_FILE ($DUMP_SIZE bytes)"
else
  echo "  ❌ Database dump FAILED. Check container status."
  exit 1
fi

# Compress
gzip -f "$DUMP_FILE"
echo "  ✅ Compressed: ${DUMP_FILE}.gz"

# ── Full Backup (source code) ──────────────────────────────────────────────

if $FULL_BACKUP; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting full source backup..."
  SRC_FILE="$BACKUP_DIR/src_backup_$TIMESTAMP.tar.gz"
  tar -czf "$SRC_FILE" \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='backups' \
    --exclude='output' \
    --exclude='uploads' \
    --exclude='*.mp4' \
    --exclude='*.mov' \
    --exclude='*.avi' \
    --exclude='*.mkv' \
    --exclude='*.zip' \
    --exclude='*.rar' \
    --exclude='.git' \
    -C "$(dirname "$SCRIPT_DIR")" tiktok-ai-factory 2>/dev/null
  echo "  ✅ Source backup: $SRC_FILE ($(du -h "$SRC_FILE" | cut -f1))"
fi

# ── Cleanup old backups ────────────────────────────────────────────────────

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleaning backups older than $RETENTION_DAYS days..."
DELETED=$(find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo "  ✅ Removed $DELETED old backup file(s)"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Backup complete"
ls -lh "$BACKUP_DIR"/*.gz 2>/dev/null | tail -5
