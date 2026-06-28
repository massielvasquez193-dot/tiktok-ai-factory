# Production Deployment Guide

> **Platform**: TikTok AI Factory v1.1 SaaS
> **Infrastructure**: Docker Compose on Ubuntu 22.04

---

## Quick Start

```bash
# 1. Clone and configure
git clone <repo-url> /opt/tiktok-video-factory
cd /opt/tiktok-video-factory

# 2. Configure environment
cp .env.example .env
# Edit .env — see PRODUCTION_ENV_TEMPLATE.md

# 3. Start all services
docker compose -f docker-compose.prod.yml up -d

# 4. Verify
curl http://localhost:4000/api/health
curl -I http://localhost:3000
```

## Service Architecture

| Service | Port | Health Check | Image |
|---------|------|-------------|-------|
| postgres | 5432 (internal) | pg_isready | postgres:16-alpine |
| redis | 6379 (internal) | redis-cli ping | redis:7-alpine |
| server | 4000 | GET /api/health | tiktok-ai-factory-server |
| web | 3000 | HTTP 200 | tiktok-ai-factory-web |
| nginx | 80, 443 | — | nginx:alpine |

## Common Operations

### Restart After Config Change
```bash
docker compose -f docker-compose.prod.yml up -d server
```

### View Logs
```bash
docker logs -f tiktok-vf-server
docker logs -f tiktok-vf-web
```

### Database Backup
```bash
./backup.sh           # Database only
./backup.sh --full    # Database + source code
```

### Database Restore
```bash
gunzip -c backups/db_backup_TIMESTAMP.sql.gz | \
  docker exec -i tiktok-vf-db psql -U tiktok -d tiktok_video_factory
```

### Enable SaaS Mode
```bash
# Edit .env: SAAS_MODE=true
docker compose -f docker-compose.prod.yml up -d server
```

### SSL Certificate Renewal
```bash
# certbot auto-renewal is configured in nginx
# Manual renewal:
certbot renew --nginx
docker compose -f docker-compose.prod.yml restart nginx
```

### Update Application
```bash
git pull origin main
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker system prune -f
```

## Health Monitoring

```bash
# Full health check
curl -s http://localhost:4000/api/health | python3 -m json.tool

# Expected response:
# {"status":"ok","version":"1.0.0","saasMode":false}
```

## Rollback

```bash
# Instant (no rebuild needed):
# Edit .env: SAAS_MODE=false
docker compose -f docker-compose.prod.yml up -d server

# Full version rollback:
git checkout <tag>
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```
