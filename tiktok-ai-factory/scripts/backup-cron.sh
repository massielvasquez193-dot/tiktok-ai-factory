#!/bin/sh
# ============================================================
# TikTok AI Factory — Automated Database Backup
# Runs: Every 6 hours via cron (inside db-backup container)
# ============================================================

set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="${PGDATABASE:-tiktok_video_factory}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting backup..."

# ─── PostgreSQL Dump ─────────────────────────────────────
pg_dump \
  -h "${PGHOST:-postgres}" \
  -U "${PGUSER:-tiktok}" \
  -d "${DB_NAME}" \
  --no-owner \
  --no-acl \
  --compress=9 \
  -f "${BACKUP_FILE}"

BACKUP_SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup created: ${BACKUP_FILE} (${BACKUP_SIZE})"

# ─── Clean old backups ───────────────────────────────────
DELETED=$(find "${BACKUP_DIR}" -name "backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleaned ${DELETED} old backup(s)"
fi

# ─── S3 Upload (optional) ────────────────────────────────
if [ -n "${S3_BUCKET}" ] && [ -n "${S3_ACCESS_KEY}" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Uploading to S3..."

  S3_PATH="s3://${S3_BUCKET}/backups/${TIMESTAMP}.sql.gz"
  S3_HOST="${S3_ENDPOINT:-s3.amazonaws.com}"

  # Upload using curl (AWS Signature V4)
  DATE_SHORT=$(date +%Y%m%d)
  DATE_FULL=$(date +%Y%m%dT%H%M%SZ)

  curl -X PUT \
    -H "Host: ${S3_BUCKET}.${S3_HOST}" \
    -H "Date: ${DATE_FULL}" \
    -H "Content-Type: application/x-gzip" \
    --data-binary "@${BACKUP_FILE}" \
    "https://${S3_BUCKET}.${S3_HOST}/backups/${TIMESTAMP}.sql.gz"

  if [ $? -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] S3 upload complete: ${S3_PATH}"
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: S3 upload failed"
  fi
fi

# ─── Backup Verification ─────────────────────────────────
if gzip -t "${BACKUP_FILE}" 2>/dev/null; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup verified OK"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Backup verification failed!"
  exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup complete."
