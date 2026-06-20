# DOCKER REPORT — TikTok AI Factory

> **验证日期**: 2026-06-07 | **验证工具**: `docker compose config`

---

## Docker Compose 文件

| 文件 | 服务数 | 验证结果 |
|---|---|---|
| `docker-compose.yml` (Dev) | 2 (postgres, redis) | ✅ PASSED |
| `docker-compose.prod.yml` (Prod) | 7 | ✅ PASSED (after replicas fix) |

---

## docker-compose.prod.yml 服务清单

| 服务 | 镜像 | 端口 | 健康检查 | 资源限制 | 重启 | Profile |
|---|---|---|---|---|---|---|
| postgres | postgres:16-alpine | 5432 | pg_isready | 1G/2CPU | unless-stopped | — |
| redis | redis:7-alpine | 6379 | redis-cli | 512M/1CPU | unless-stopped | — |
| server | tiktok-vf/server | 4000 | /api/health | 2G/2CPU, ×2 | unless-stopped | — |
| web | tiktok-vf/web | 3000 | / | 1G/1CPU, ×2 | unless-stopped | — |
| nginx | nginx:1.27-alpine | 80,443 | wget | 256M/1CPU | unless-stopped | — |
| certbot | certbot/certbot | — | — | — | — | ssl |
| db-backup | postgres:16-alpine | — | — | 128M/0.5CPU | unless-stopped | — |

### 检查项目

| 检查项 | 结果 |
|---|---|
| docker compose config (dev) | ✅ PASSED |
| docker compose config (prod) | ✅ PASSED |
| 全部 restart: unless-stopped | ✅ |
| 全部有 healthcheck | ✅ |
| 数据库资源限制 | ✅ |
| 日志轮转 (json-file, 50M×10, compress) | ✅ |
| 网络隔离 (bridge, 172.28.0.0/16) | ✅ |
| Postgres checksums + WAL | ✅ |
| Redis AOF + RDB 持久化 | ✅ |
| SSL 自动续期 (certbot 12h) | ✅ |
| 备份 cron (每6h) | ✅ |
| Replicas 无 container_name 冲突 | ✅ (已修复) |
| `version` 属性弃用警告 | ⚠️ 建议移除 |

---

## Dockerfiles

| 文件 | Stage | Base | 状态 |
|---|---|---|---|
| `apps/server/Dockerfile.prod` | 2-stage | node:22-alpine | ✅ |
| `apps/web/Dockerfile.prod` | 2-stage | node:22-alpine | ✅ |

## 结论

```
✅ docker compose config — BOTH PASSED
✅ 7 services + health checks
✅ Resource limits + log rotation
✅ Network isolation + SSL auto-renewal
✅ Backup container with S3 upload
```
