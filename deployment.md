# TikTok AI Factory — Production Deployment Guide

**Version:** 2.1  
**Date:** 2026-06-06  

## Quick Start (New Machine)

```powershell
# Windows
.\restore.ps1

# Any OS with Docker
docker compose -f docker-compose.prod.yml up -d
```

### URLs

| Service | URL |
|---------|-----|
| Dashboard | http://localhost:3000 |
| API Health | http://localhost:4000/api/health |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## Data Persistence

| Data | Location | Backup |
|------|----------|--------|
| Database | `postgres_data` volume | `backup.ps1` |
| Redis | `redis_data` volume | appendonly.aof |
| Uploads | `./uploads/` bind mount | `backup.ps1` |
| Videos | `./output/videos/` bind mount | `backup.ps1` |
| Research | `./output/research/` bind mount | `backup.ps1` |

## Scripts

| Script | Purpose |
|--------|---------|
| `backup.ps1` | Backup database + uploads + videos |
| `restore.ps1` | Restore from latest backup |
| `docker-save.ps1` | Export Docker images for offline deploy |
| `docker-load.ps1` | Load exported images (no internet needed) |
| `deploy.sh` | Linux one-click deploy |
| `deploy.ps1` | Windows one-click deploy |

## Offline Deployment

```powershell
# On source machine
.\docker-save.ps1

# Transfer docker-export/ to target machine

# On target machine (no internet required)
cd docker-export
.\docker-load.ps1
```

## Production Stack

```
docker compose -f docker-compose.prod.yml up -d
├── PostgreSQL 16 (Alpine)
├── Redis 7 (Alpine)
├── TikTok Factory App (Node.js 22)
│   ├── Next.js frontend (:3000)
│   └── Express API (:4000)
└── Persistent volumes for all data
```

## Environment

Copy `.env.production` and fill in:

```env
DB_USER=tiktok
DB_PASSWORD=your-secure-password
SEEDANCE_API_KEY=ark-xxx
OPENAI_API_KEY=sk-xxx
```
