#!/bin/bash
# ============================================================
# TikTok AI Factory — SSL 证书续期 (certbot standalone)
# 用法: /home/ubuntu/tiktok-ai-factory/scripts/renew-ssl.sh
# Cron: 0 3 * * * /home/ubuntu/tiktok-ai-factory/scripts/renew-ssl.sh >> /home/ubuntu/tiktok-ai-factory/nginx/logs/ssl-renew.log 2>&1
# ============================================================

set -e

PROJECT_DIR="/home/ubuntu/tiktok-ai-factory"
CERT_SRC="/etc/letsencrypt/live/ttvideoai.com"
CERT_DST="${PROJECT_DIR}/nginx/ssl/live/ttvideoai.com"
NGINX_CONTAINER="tiktok-vf-nginx"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

log "=== SSL Renewal Started ==="

# 1. Stop Docker Nginx (释放 80 端口给 certbot standalone)
log "Stopping Nginx container..."
docker stop "${NGINX_CONTAINER}" 2>/dev/null || true

# 2. Renew certificate
log "Renewing certificate..."
certbot renew --standalone --quiet --agree-tos

# 3. Copy certs to Docker Nginx SSL directory
log "Copying certificates..."
mkdir -p "${CERT_DST}"
cp "${CERT_SRC}/fullchain.pem" "${CERT_DST}/fullchain.pem"
cp "${CERT_SRC}/privkey.pem"   "${CERT_DST}/privkey.pem"
chmod 644 "${CERT_DST}/fullchain.pem"
chmod 600 "${CERT_DST}/privkey.pem"

# 4. Start Nginx
log "Starting Nginx container..."
docker start "${NGINX_CONTAINER}"

# 5. Reload Nginx
log "Reloading Nginx..."
sleep 2
docker exec "${NGINX_CONTAINER}" nginx -t && \
docker exec "${NGINX_CONTAINER}" nginx -s reload

log "=== SSL Renewal Complete ==="
