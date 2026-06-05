#!/bin/bash
# TikTok AI Factory — Database Backup Script

BACKUP_DIR="./backups"
DB_NAME="tiktok_video_factory"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "Backing up database..."
if command -v pg_dump >/dev/null 2>&1; then
  PGPASSWORD="${DB_PASSWORD:-changeme123}" pg_dump -h localhost -U "${DB_USER:-tiktok}" "$DB_NAME" > "$BACKUP_DIR/backup_$TIMESTAMP.sql"
else
  cp apps/server/prisma/dev.db "$BACKUP_DIR/backup_$TIMESTAMP.db"
fi

echo "Compressing..."
gzip "$BACKUP_DIR/backup_$TIMESTAMP"*

echo "Cleaning old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup complete: $BACKUP_DIR/backup_$TIMESTAMP.sql.gz"
