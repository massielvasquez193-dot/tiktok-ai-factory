# TikTok AI Factory — Production Deployment Guide

**Version:** 2.1  
**Date:** 2026-06-06  
**Target:** Linux (Ubuntu 22.04+) / Windows Server 2022+ / macOS  

---

## Architecture

```
                    ┌─────────────────┐
                    │   Nginx (:80)   │
                    │   Reverse Proxy │
                    └──────┬──────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
    ┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
    │  Next.js     │ │ Express    │ │  Static    │
    │  :3000       │ │ :4000      │ │  Files     │
    └──────────────┘ └─────┬──────┘ └────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼─────┐ ┌───▼────┐ ┌─────▼─────┐
       │ PostgreSQL │ │ Redis  │ │  Backup   │
       │ :5432      │ │ :6379  │ │  Cron     │
       └────────────┘ └────────┘ └───────────┘
```

## Files

| File | Path | Purpose |
|------|------|---------|
| Dockerfile (server) | `apps/server/Dockerfile.prod` | Multi-stage Node.js build |
| Dockerfile (web) | `apps/web/Dockerfile.prod` | Next.js production build |
| Compose | `docker-compose.prod.yml` | 5 services orchestration |
| Nginx | `nginx/nginx.conf` | Reverse proxy + rate limiting |
| Deploy (Linux) | `deploy.sh` | One-command Linux deploy |
| Deploy (Windows) | `deploy.ps1` | PowerShell Windows deploy |
| CI/CD | `.github/workflows/deploy.yml` | GitHub Actions pipeline |
| Env | `.env.production` | Production environment variables |
| PM2 | `ecosystem.config.js` | Cluster mode process manager |
| Backup | `backup.sh` | Daily database backup |

## Quick Deploy

### Docker (Any Platform)
```bash
docker compose -f docker-compose.prod.yml up -d
# → http://localhost:80 (Nginx)
# → http://localhost:3000 (Web)
# → http://localhost:4000/api/health (API)
```

### Linux / Ubuntu
```bash
bash deploy.sh
```

### Windows
```powershell
.\deploy.ps1
```

## Cloud Deploy

### 腾讯云 CVM
```bash
# 1. SSH into instance
ssh root@your-cvm-ip

# 2. Install Docker
curl -fsSL https://get.docker.com | bash

# 3. Clone + Deploy
git clone https://github.com/massielvasquez193-dot/tiktok-ai-factory.git
cd tiktok-ai-factory
bash deploy.sh

# 4. Open firewall
# 腾讯云控制台 → 安全组 → 放行 80/443
```

### 阿里云 ECS
```bash
# Same as Tencent Cloud, plus:
# 阿里云控制台 → 安全组 → 入方向 → 允许 80/443/3000/4000
```

### AWS EC2
```bash
# 1. Launch EC2 (Ubuntu 22.04, t3.medium+)
# 2. Security Group: allow 80/443/3000/4000
# 3. SSH + deploy (same as Linux above)
```

## Environment Variables

Edit `.env.production`:
```env
DB_USER=tiktok
DB_PASSWORD=your-secure-password
DB_NAME=tiktok_video_factory
SEEDANCE_API_KEY=your-key
OPENAI_API_KEY=your-key
```

## CI/CD (GitHub Actions)

Push to `main` → Auto-build → Docker push → SSH deploy

Configure secrets in GitHub:
- `DOCKER_USERNAME` / `DOCKER_TOKEN`
- `DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_SSH_KEY`

## Monitoring

| Service | Health Check |
|---------|-------------|
| Web | `curl http://localhost:3000` |
| API | `curl http://localhost:4000/api/health` |
| DB | `docker compose exec postgres pg_isready` |
| Redis | `docker compose exec redis redis-cli ping` |

## Backup

```bash
# Manual backup
bash backup.sh

# Auto backup (crontab -e)
0 2 * * * cd /opt/tiktok-ai-factory && bash backup.sh
```

## Recovery

```bash
git clone https://github.com/massielvasquez193-dot/tiktok-ai-factory.git
cd tiktok-ai-factory
unzip TikTok-AI-Factory-Migration.zip
docker compose -f docker-compose.prod.yml up -d
```
