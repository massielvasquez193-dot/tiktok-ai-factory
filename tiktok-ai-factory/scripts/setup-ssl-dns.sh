#!/usr/bin/env bash
# ============================================================
# TikTok AI Factory — SSL via DNS-01 (Cloudflare)
# ============================================================
# 用法:
#   1. 创建 Cloudflare API Token: https://dash.cloudflare.com/profile/api-tokens
#      权限: Zone:DNS:Edit
#   2. 写入 .env:
#      CLOUDFLARE_API_TOKEN=xxx
#      LETSENCRYPT_EMAIL=admin@ttvideoai.com
#      DOMAIN=ttvideoai.com
#   3. chmod +x scripts/setup-ssl-dns.sh
#   4. ./scripts/setup-ssl-dns.sh
# ============================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SSL_DIR="${PROJECT_DIR}/nginx/ssl"
CF_INI="${PROJECT_DIR}/nginx/cloudflare.ini"

# Load env
[ -f "${PROJECT_DIR}/.env" ] && set -a && source "${PROJECT_DIR}/.env" && set +a

DOMAIN="${DOMAIN:-ttvideoai.com}"
EMAIL="${LETSENCRYPT_EMAIL:-admin@ttvideoai.com}"
CF_TOKEN="${CLOUDFLARE_API_TOKEN:-}"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${CYAN}[SSL]${NC} $1"; }
ok()   { echo -e "${GREEN}  ✓${NC} $1"; }
err()  { echo -e "${RED}  ✗${NC} $1"; }

# ─── Pre-check ────────────────────────────────────────────
log "Checking prerequisites..."

if [ -z "${CF_TOKEN}" ]; then
    err "CLOUDFLARE_API_TOKEN not set in .env"
    echo "  Get one at: https://dash.cloudflare.com/profile/api-tokens"
    echo "  Required permission: Zone:DNS:Edit"
    exit 1
fi
ok "Cloudflare API token found"

# ─── Create directories ───────────────────────────────────
log "Creating SSL directories..."
mkdir -p "${SSL_DIR}"/{live,archive,renewal}
ok "SSL directories ready"

# ─── Cloudflare credentials file ──────────────────────────
log "Writing Cloudflare credentials..."
cat > "${CF_INI}" << EOF
dns_cloudflare_api_token = ${CF_TOKEN}
EOF
chmod 600 "${CF_INI}"
ok "Cloudflare credentials saved (${CF_INI})"

# ─── Fix Nginx volume permissions temporarily ─────────────
log "Ensuring Nginx container can write to SSL dir..."
docker compose -f "${PROJECT_DIR}/docker-compose.prod.yml" up -d nginx 2>/dev/null || true

# ─── Install certbot in Nginx container ───────────────────
log "Installing certbot + Cloudflare DNS plugin..."
docker compose -f "${PROJECT_DIR}/docker-compose.prod.yml" exec -T nginx \
    apk add --no-cache certbot py3-pip 2>/dev/null || true
docker compose -f "${PROJECT_DIR}/docker-compose.prod.yml" exec -T nginx \
    pip install certbot-dns-cloudflare 2>/dev/null || true
ok "certbot installed"

# ─── Request certificate ──────────────────────────────────
log "Requesting SSL certificate for ${DOMAIN} (DNS-01 via Cloudflare)..."
docker compose -f "${PROJECT_DIR}/docker-compose.prod.yml" exec -T nginx \
    certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials /etc/nginx/cloudflare.ini \
    --dns-cloudflare-propagation-seconds 60 \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" \
    --non-interactive \
    --agree-tos \
    --email "${EMAIL}" \
    --config-dir /etc/nginx/ssl \
    --work-dir /etc/nginx/ssl \
    --logs-dir /etc/nginx/ssl

ok "SSL certificate obtained!"

# ─── Verify certificate ───────────────────────────────────
log "Verifying certificate..."
CERT_DIR="${SSL_DIR}/live/${DOMAIN}"
if [ -f "${CERT_DIR}/fullchain.pem" ] && [ -f "${CERT_DIR}/privkey.pem" ]; then
    ok "fullchain.pem ✓"
    ok "privkey.pem ✓"

    # Show expiry
    EXPIRY=$(openssl x509 -enddate -noout -in "${CERT_DIR}/fullchain.pem" 2>/dev/null | cut -d= -f2)
    ok "Expires: ${EXPIRY}"
else
    err "Certificate files not found at ${CERT_DIR}"
    exit 1
fi

# ─── Update Nginx config to use new cert path ─────────────
log "Certificate path: /etc/nginx/ssl/live/${DOMAIN}/"
ok "Update nginx/nginx.conf if needed:"
echo "  ssl_certificate     /etc/nginx/ssl/live/${DOMAIN}/fullchain.pem;"
echo "  ssl_certificate_key /etc/nginx/ssl/live/${DOMAIN}/privkey.pem;"

# ─── Reload Nginx ─────────────────────────────────────────
log "Reloading Nginx..."
docker compose -f "${PROJECT_DIR}/docker-compose.prod.yml" exec -T nginx nginx -s reload 2>/dev/null || true
ok "Nginx reloaded"

# ─── Set up auto-renewal cron ─────────────────────────────
log "Setting up auto-renewal cron (daily at 02:00)..."
RENEW_CRON="0 2 * * * cd ${PROJECT_DIR} && docker compose -f docker-compose.prod.yml exec -T nginx certbot renew --quiet --config-dir /etc/nginx/ssl --work-dir /etc/nginx/ssl --logs-dir /etc/nginx/ssl --deploy-hook 'nginx -s reload'"

# Add to crontab if not already present
if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
    (crontab -l 2>/dev/null; echo "${RENEW_CRON}") | crontab -
    ok "Auto-renewal cron added"
else
    ok "Auto-renewal cron already exists"
fi

# ─── Cleanup ──────────────────────────────────────────────
rm -f "${CF_INI}"
ok "Cloudflare credentials cleaned up"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        SSL Certificate Installed!        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Domain:     ${CYAN}https://${DOMAIN}${NC}"
echo -e "  Cert path:  ${SSL_DIR}/live/${DOMAIN}/"
echo -e "  Auto-renew: Daily at 02:00 AM"
echo -e "  Test:       ${CYAN}curl https://${DOMAIN}/api/health${NC}"
echo ""
