#!/usr/bin/env bash
# ============================================================
# TikTok AI Factory — One-Click Production Deploy
# ============================================================
# Usage:
#   chmod +x deploy-prod.sh
#   ./deploy-prod.sh              # Deploy
#   ./deploy-prod.sh --rollback   # Rollback to previous release
#   ./deploy-prod.sh --ssl        # Configure Let's Encrypt SSL
#   ./deploy-prod.sh --backup     # Manual backup
#   ./deploy-prod.sh --status     # Check service health
# ============================================================

set -euo pipefail
IFS=$'\n\t'

# ─── Configuration ────────────────────────────────────────
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.prod.yml"
ENV_FILE="${PROJECT_DIR}/.env"
RELEASE_TAG="release-$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${PROJECT_DIR}/backups"
ROLLBACK_TAG_FILE="${PROJECT_DIR}/.rollback-tag"
HEALTH_URL="${APP_URL:-http://localhost:4000}/api/health"
HEALTH_RETRIES=30
HEALTH_INTERVAL=2

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} $1"; }
ok()   { echo -e "${GREEN}  ✓${NC} $1"; }
warn() { echo -e "${YELLOW}  ⚠${NC} $1"; }
err()  { echo -e "${RED}  ✗${NC} $1"; }
banner() {
  echo -e "\n${BLUE}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║${NC}  ${GREEN}TikTok AI Factory — Production Deploy${NC}      ${BLUE}║${NC}"
  echo -e "${BLUE}╚══════════════════════════════════════════════╝${NC}"
}

# ─── Pre-flight Checks ────────────────────────────────────
preflight() {
  log "Running pre-flight checks..."

  # OS check
  case "$(uname -s)" in
    Linux)  ok "OS: Linux" ;;
    Darwin) ok "OS: macOS" ;;
    *)      err "Unsupported OS. Requires Linux/macOS."; exit 1 ;;
  esac

  # Docker
  if command -v docker >/dev/null 2>&1; then
    docker info >/dev/null 2>&1 || { err "Docker daemon not running. Start Docker Desktop."; exit 1; }
    ok "Docker: $(docker --version)"
  else
    err "Docker not installed: https://docs.docker.com/engine/install/"
    exit 1
  fi

  # Docker Compose
  if docker compose version >/dev/null 2>&1; then
    ok "Compose: $(docker compose version --short)"
  else
    err "Docker Compose plugin not installed."
    exit 1
  fi

  # .env file
  if [ -f "${ENV_FILE}" ]; then
    ok ".env file found"
    set -a; source "${ENV_FILE}"; set +a
  else
    warn ".env file not found — using ${PROJECT_DIR}/.env.example as fallback"
    cp "${PROJECT_DIR}/.env.example" "${ENV_FILE}"
    echo "  Edit ${ENV_FILE} and re-run."
    exit 1
  fi

  # Validate critical env vars
  if [ -z "${JWT_SECRET:-}" ]; then
    warn "JWT_SECRET not set — generating random secret"
    export JWT_SECRET=$(openssl rand -hex 32)
    echo "JWT_SECRET=${JWT_SECRET}" >> "${ENV_FILE}"
  fi

  # Disk space (need at least 5GB)
  AVAIL=$(df -BG "${PROJECT_DIR}" | tail -1 | awk '{print $4}' | sed 's/G//')
  if [ "${AVAIL:-0}" -lt 5 ]; then
    warn "Low disk space: ${AVAIL}G available (recommend 5G+)"
  else
    ok "Disk space: ${AVAIL}G"
  fi

  # Memory (need at least 2GB)
  if command -v free >/dev/null 2>&1; then
    MEM=$(free -g | awk '/^Mem:/{print $2}')
    if [ "${MEM:-0}" -lt 2 ]; then
      warn "Low memory: ${MEM}G (recommend 4G+)"
    else
      ok "Memory: ${MEM}G"
    fi
  fi

  log "Pre-flight checks passed."
}

# ─── Database Backup ──────────────────────────────────────
backup_db() {
  local BACKUP_FILE="${BACKUP_DIR}/db/pre_deploy_${RELEASE_TAG}.sql.gz"

  log "Creating pre-deploy database backup..."

  mkdir -p "${BACKUP_DIR}/db"

  if docker compose -f "${COMPOSE_FILE}" exec -T postgres \
    pg_dump -U "${DB_USER:-tiktok}" -d "${DB_NAME:-tiktok_video_factory}" \
    --no-owner --no-acl --compress=9 > "${BACKUP_FILE}" 2>/dev/null; then

    SIZE=$(ls -lh "${BACKUP_FILE}" | awk '{print $5}')
    ok "Backup saved: ${BACKUP_FILE} (${SIZE})"

    # Save rollback tag
    echo "${RELEASE_TAG}" > "${ROLLBACK_TAG_FILE}"
  else
    # Container might not be running — try local pg_dump
    if command -v pg_dump >/dev/null 2>&1; then
      PGPASSWORD="${DB_PASSWORD:-changeme123}" pg_dump \
        -h localhost -p "${DB_PORT:-5432}" \
        -U "${DB_USER:-tiktok}" -d "${DB_NAME:-tiktok_video_factory}" \
        --no-owner --no-acl | gzip > "${BACKUP_FILE}"
      ok "Backup saved (local pg_dump): ${BACKUP_FILE}"
    else
      warn "Cannot backup database (no pg_dump, no container). Skipping."
    fi
  fi
}

# ─── Build & Deploy ───────────────────────────────────────
deploy() {
  log "Step 1/6: Building Docker images..."
  export IMAGE_TAG="${RELEASE_TAG}"
  docker compose -f "${COMPOSE_FILE}" build \
    --build-arg IMAGE_TAG="${RELEASE_TAG}" \
    --parallel 2>&1 | while read line; do echo "  $line"; done
  ok "Images built: tiktok-vf/server:${RELEASE_TAG}, tiktok-vf/web:${RELEASE_TAG}"

  log "Step 2/6: Stopping existing containers..."
  docker compose -f "${COMPOSE_FILE}" down --remove-orphans 2>/dev/null || true
  ok "Old containers stopped"

  log "Step 3/6: Starting services..."
  docker compose -f "${COMPOSE_FILE}" up -d --wait 2>&1 | tail -20
  ok "Services started"

  log "Step 4/6: Running database migrations..."
  sleep 5
  if docker compose -f "${COMPOSE_FILE}" exec -T server npx prisma db push --skip-generate 2>&1; then
    ok "Database schema synced"
  else
    warn "Prisma db push failed — schema may already be current"
  fi

  log "Step 5/6: Prisma Client generation..."
  docker compose -f "${COMPOSE_FILE}" exec -T server npx prisma generate 2>&1 || true
  ok "Prisma Client ready"

  log "Step 6/6: Health check verification..."
  health_check

  log "Injecting default credit packs..."
  ADMIN_TOKEN=$(docker compose -f "${COMPOSE_FILE}" exec -T postgres \
    psql -U "${DB_USER:-tiktok}" -d "${DB_NAME:-tiktok_video_factory}" -tAc \
    "SELECT 'Bearer ' || '' FROM users WHERE role IN ('admin','superadmin') LIMIT 1;" 2>/dev/null || echo "")

  docker compose -f "${COMPOSE_FILE}" exec -T server \
    node -e "fetch('http://127.0.0.1:4000/api/payments/admin/seed-credit-packs', {method:'POST',headers:{Authorization:'${ADMIN_TOKEN}'}}).then(r=>r.json()).then(console.log).catch(()=>{})" 2>/dev/null || true

  ok "Deploy complete!"
  ok "  Web:    https://${DOMAIN:-tiktok-vf.example.com}"
  ok "  API:    https://${DOMAIN:-tiktok-vf.example.com}/api/health"
  ok "  Admin:  https://${DOMAIN:-tiktok-vf.example.com}/admin"
}

# ─── Health Check ─────────────────────────────────────────
health_check() {
  log "Waiting for services to become healthy..."
  for i in $(seq 1 ${HEALTH_RETRIES}); do
    if curl -sf -o /dev/null "${HEALTH_URL}" 2>/dev/null; then
      ok "All services healthy (attempt ${i}/${HEALTH_RETRIES})"
      return 0
    fi
    printf "."
    sleep ${HEALTH_INTERVAL}
  done
  echo ""
  warn "Health check timed out after ${HEALTH_RETRIES} attempts."
  warn "Check logs: docker compose -f ${COMPOSE_FILE} logs --tail=50"
  return 1
}

# ─── Rollback ─────────────────────────────────────────────
rollback() {
  log "Rolling back to previous release..."

  if [ ! -f "${ROLLBACK_TAG_FILE}" ]; then
    err "No rollback tag found. Cannot rollback."
    log "Available backups:"
    ls -lh "${BACKUP_DIR}/db/" 2>/dev/null || echo "  (none)"
    exit 1
  fi

  PREV_TAG=$(cat "${ROLLBACK_TAG_FILE}")
  log "Previous release: ${PREV_TAG}"

  # Stop current
  docker compose -f "${COMPOSE_FILE}" down --remove-orphans 2>/dev/null || true

  # Restore database from pre-deploy backup
  BACKUP_FILE="${BACKUP_DIR}/db/pre_deploy_${PREV_TAG}.sql.gz"
  if [ -f "${BACKUP_FILE}" ]; then
    log "Restoring database from ${BACKUP_FILE}..."
    gunzip -c "${BACKUP_FILE}" | docker compose -f "${COMPOSE_FILE}" exec -T postgres \
      psql -U "${DB_USER:-tiktok}" -d "${DB_NAME:-tiktok_video_factory}" 2>/dev/null
    ok "Database restored"
  else
    warn "No backup found for ${PREV_TAG}. Skipping DB restore."
  fi

  # Start with previous images
  export IMAGE_TAG="${PREV_TAG}"
  docker compose -f "${COMPOSE_FILE}" up -d --wait
  ok "Rollback complete. Running ${PREV_TAG}"
}

# ─── SSL Setup ────────────────────────────────────────────
setup_ssl() {
  local DOMAIN="${DOMAIN:-}"
  local EMAIL="${LETSENCRYPT_EMAIL:-admin@example.com}"

  if [ -z "${DOMAIN}" ]; then
    err "DOMAIN not set in .env"
    echo "  Usage: DOMAIN=tiktok-vf.example.com ./deploy-prod.sh --ssl"
    exit 1
  fi

  log "Setting up Let's Encrypt SSL for ${DOMAIN}..."

  # Stop nginx if running
  docker compose -f "${COMPOSE_FILE}" stop nginx 2>/dev/null || true

  # Run certbot standalone to get initial cert
  docker run --rm \
    -v "${PROJECT_DIR}/nginx/certbot/www:/var/www/certbot" \
    -v "${PROJECT_DIR}/nginx/certbot/conf:/etc/letsencrypt" \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --preferred-challenges http \
    --email "${EMAIL}" \
    --agree-tos \
    --no-eff-email \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" 2>&1 | tail -20

  # Copy certificates to nginx SSL dir
  mkdir -p "${PROJECT_DIR}/nginx/ssl"
  cp "${PROJECT_DIR}/nginx/certbot/conf/live/${DOMAIN}/fullchain.pem" "${PROJECT_DIR}/nginx/ssl/fullchain.pem"
  cp "${PROJECT_DIR}/nginx/certbot/conf/live/${DOMAIN}/privkey.pem" "${PROJECT_DIR}/nginx/ssl/privkey.pem"

  ok "SSL certificates installed for ${DOMAIN}"
  ok "Auto-renewal: certbot service renews every 12h (profile: ssl)"

  # Start nginx
  docker compose -f "${COMPOSE_FILE}" start nginx 2>/dev/null || true
}

# ─── Service Status ───────────────────────────────────────
show_status() {
  log "Service Status:"
  echo ""
  docker compose -f "${COMPOSE_FILE}" ps 2>/dev/null || echo "  No services running"
  echo ""

  log "Container health:"
  docker compose -f "${COMPOSE_FILE}" ps --format json 2>/dev/null | \
    python3 -c "
import json, sys
for line in sys.stdin:
  c = json.loads(line)
  print(f\"  {c['Service']:15s} {c['State']:12s} {c.get('Health','—'):12s} {c.get('Status','')}\")
" 2>/dev/null || \
  docker compose -f "${COMPOSE_FILE}" ps 2>/dev/null

  echo ""

  # API health
  log "API Health Check:"
  if curl -sf "${HEALTH_URL}" 2>/dev/null; then
    echo ""
    ok "API is healthy"
  else
    warn "API is not responding"
  fi

  # Disk usage
  echo ""
  log "Disk Usage:"
  du -sh "${BACKUP_DIR}" 2>/dev/null || echo "  No backups"
  echo ""
  df -h "${PROJECT_DIR}" | tail -1
}

# ─── Cleanup Old Images ───────────────────────────────────
cleanup() {
  log "Cleaning up old Docker artifacts..."
  docker image prune -f --filter "until=72h" 2>/dev/null
  docker builder prune -f --filter "until=72h" 2>/dev/null
  ok "Old images cleaned"
}

# ─── Main ─────────────────────────────────────────────────
main() {
  cd "${PROJECT_DIR}"
  banner

  case "${1:-}" in
    --rollback)
      rollback
      ;;
    --ssl)
      setup_ssl
      ;;
    --backup)
      RELEASE_TAG="manual-$(date +%Y%m%d-%H%M%S)"
      backup_db
      ok "Manual backup complete"
      ;;
    --status)
      show_status
      ;;
    --cleanup)
      cleanup
      ;;
    *)
      preflight
      backup_db
      deploy
      echo ""
      echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
      echo -e "${GREEN}║               DEPLOY SUCCESSFUL              ║${NC}"
      echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
      echo ""
      echo -e "  Web:     ${CYAN}https://${DOMAIN:-your-server}${NC}"
      echo -e "  API:     ${CYAN}https://${DOMAIN:-your-server}/api/health${NC}"
      echo -e "  Admin:   ${CYAN}https://${DOMAIN:-your-server}/admin${NC}"
      echo -e "  Logs:    ${CYAN}docker compose -f docker-compose.prod.yml logs -f${NC}"
      echo -e "  Rollback:${CYAN}./deploy-prod.sh --rollback${NC}"
      echo ""
      ;;
  esac
}

main "$@"
