#!/usr/bin/env bash
# ============================================================
# TikTok AI Factory — 一键 SSL (Cloudflare DNS-01)
# ============================================================
# 在 Ubuntu 服务器上执行 (Docker 已运行, Nginx 容器已启动)
#
# 前置条件:
#   1. CLOUDFLARE_API_TOKEN 已写入 .env
#   2. DOMAIN=ttvideoai.com 已配置
#   3. LETSENCRYPT_EMAIL 已配置
#
# 用法:
#   chmod +x scripts/ssl-auto.sh
#   ./scripts/ssl-auto.sh
# ============================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${PROJECT_DIR}"

# Load env
set -a; source .env; set +a

CF_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
DOMAIN="${DOMAIN:-ttvideoai.com}"
EMAIL="${LETSENCRYPT_EMAIL:-admin@ttvideoai.com}"
NGINX_CONTAINER="tiktok-vf-nginx"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${CYAN}[SSL]${NC} $1"; }
ok()   { echo -e "${GREEN}  OK${NC} $1"; }
die()  { echo -e "${RED}  FAIL${NC} $1"; exit 1; }

# ═══════════════════════════════════════════════════════════
# Step 1: Validate
# ═══════════════════════════════════════════════════════════
log "Step 1/7: Validating environment..."

[ -z "${CF_TOKEN}" ] && die "CLOUDFLARE_API_TOKEN is empty. Get one at https://dash.cloudflare.com/profile/api-tokens"
docker ps --format '{{.Names}}' | grep -q "${NGINX_CONTAINER}" || die "Nginx container '${NGINX_CONTAINER}' not running"
ok "Cloudflare token found + Nginx container running"

# ═══════════════════════════════════════════════════════════
# Step 2: Write Cloudflare credentials
# ═══════════════════════════════════════════════════════════
log "Step 2/7: Writing Cloudflare credentials..."
mkdir -p nginx/ssl/live
cat > nginx/cloudflare.ini << EOF
dns_cloudflare_api_token = ${CF_TOKEN}
EOF
chmod 600 nginx/cloudflare.ini
ok "nginx/cloudflare.ini written (600)"

# ═══════════════════════════════════════════════════════════
# Step 3: Install certbot + Cloudflare plugin
# ═══════════════════════════════════════════════════════════
log "Step 3/7: Installing certbot + dns-cloudflare plugin..."
docker exec -i "${NGINX_CONTAINER}" sh -c "
  apk add --no-cache certbot py3-pip > /dev/null 2>&1 && \
  pip install certbot-dns-cloudflare > /dev/null 2>&1 && \
  echo 'certbot installed'
" || die "Failed to install certbot"
ok "certbot + certbot-dns-cloudflare installed"

# ═══════════════════════════════════════════════════════════
# Step 4: Request certificate (DNS-01)
# ═══════════════════════════════════════════════════════════
log "Step 4/7: Requesting SSL certificate via DNS-01..."
log "  Domains: ${DOMAIN}, www.${DOMAIN}"
log "  Propagation wait: 60s..."

docker exec -i "${NGINX_CONTAINER}" sh -c "
  certbot certonly \
    --dns-cloudflare \
    --dns-cloudflare-credentials /etc/nginx/cloudflare.ini \
    --dns-cloudflare-propagation-seconds 60 \
    -d ${DOMAIN} \
    -d www.${DOMAIN} \
    --non-interactive \
    --agree-tos \
    --email ${EMAIL} \
    --config-dir /etc/nginx/ssl \
    --work-dir /etc/nginx/ssl \
    --logs-dir /etc/nginx/ssl
" || die "Certificate request failed"

ok "Certificate obtained!"

# ═══════════════════════════════════════════════════════════
# Step 5: Verify certificate
# ═══════════════════════════════════════════════════════════
log "Step 5/7: Verifying certificate files..."

CERT_DIR="nginx/ssl/live/${DOMAIN}"
if [ -f "${CERT_DIR}/fullchain.pem" ] && [ -f "${CERT_DIR}/privkey.pem" ]; then
    EXPIRY=$(openssl x509 -enddate -noout -in "${CERT_DIR}/fullchain.pem" 2>/dev/null | cut -d= -f2)
    ok "fullchain.pem (expires: ${EXPIRY})"
    ok "privkey.pem"
else
    die "Certificate files not found at ${CERT_DIR}"
fi

# ═══════════════════════════════════════════════════════════
# Step 6: Reload Nginx
# ═══════════════════════════════════════════════════════════
log "Step 6/7: Reloading Nginx..."
docker exec -i "${NGINX_CONTAINER}" nginx -s reload 2>/dev/null || \
  docker exec -i "${NGINX_CONTAINER}" nginx -t && \
  docker exec -i "${NGINX_CONTAINER}" nginx -s reload
ok "Nginx reloaded"

# ═══════════════════════════════════════════════════════════
# Step 7: Auto-renewal cron + cleanup
# ═══════════════════════════════════════════════════════════
log "Step 7/7: Configuring auto-renewal + cleanup..."

# Write renewal cron (system crontab)
RENEW_CMD="0 2 * * * root cd ${PROJECT_DIR} && docker exec -i ${NGINX_CONTAINER} certbot renew --quiet --config-dir /etc/nginx/ssl --work-dir /etc/nginx/ssl --logs-dir /etc/nginx/ssl && docker exec -i ${NGINX_CONTAINER} nginx -s reload"
echo "${RENEW_CMD}" | sudo tee /etc/cron.d/tiktok-vf-ssl-renew > /dev/null 2>&1 || {
    # Fallback: user crontab
    (crontab -l 2>/dev/null | grep -v "certbot renew"; echo "${RENEW_CMD}") | crontab -
}
ok "Auto-renewal: daily 02:00 AM"

# Clean Cloudflare credentials
rm -f nginx/cloudflare.ini
ok "Cloudflare credentials cleaned"

# ═══════════════════════════════════════════════════════════
# Done
# ═══════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║      SSL Certificate Deployed!          ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Site:     ${CYAN}https://${DOMAIN}${NC}"
echo -e "  API:      ${CYAN}https://${DOMAIN}/api/health${NC}"
echo -e "  Admin:    ${CYAN}https://${DOMAIN}/admin${NC}"
echo -e "  Renew:    Daily at 02:00 AM"
echo -e "  Cert:     ${CERT_DIR}/"
echo ""
