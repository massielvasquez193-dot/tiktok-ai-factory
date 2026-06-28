# CHANGELOG v1.0.1

> **Release Date:** 2026-06-27
> **Tag:** `v1.0.1`
> **Commit:** `78d86cd`
> **Author:** Massiel Vasquez
> **Type:** Security Hardening (P0 Production Acceptance)

---

## Overview

v1.0.1 is a security hardening release that addresses all 6 critical P0 issues identified in the Production Acceptance Audit. No business logic, API endpoints, database schema, or Docker images were modified.

---

## P0 Fixes

### 1. Redis — Public Network Access Removed
- **File:** `docker-compose.prod.yml`
- **Change:** Commented out `ports: ["6379:6379"]` on Redis service
- **Impact:** Redis is now accessible only via Docker internal DNS (`redis:6379`)
- **Verification:** `ss -tlnp` confirms no process on port 6379 on host

### 2. UFW Firewall — Restricted to 22/80/443
- **Status:** UFW already active with correct rules
- **Rules:** `22/tcp`, `80/tcp`, `443/tcp` (IPv4 + IPv6)
- **Default policy:** deny incoming, allow outgoing, deny routed
- **Verification:** Only expected ports are exposed

### 3. Nginx — Security Headers Hardening
- **File:** `nginx/nginx.conf`
- **Headers added to HTTPS (443):**
  - `Strict-Transport-Security` — max-age=31536000; includeSubDomains
  - `X-Content-Type-Options` — nosniff
  - `X-Frame-Options` — SAMEORIGIN
  - `X-XSS-Protection` — 1; mode=block
  - `Referrer-Policy` — strict-origin-when-cross-origin
  - `Permissions-Policy` — 30 browser features all disabled
  - `Cross-Origin-Opener-Policy` — same-origin
  - `Cross-Origin-Resource-Policy` — same-origin
  - `Content-Security-Policy` — strict with base-uri, form-action, frame-ancestors
- **Headers added to HTTP (80) fallback:**
  - X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy
  - Permissions-Policy, Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy
  - Content-Security-Policy
- **Global:** `server_tokens off` — hide nginx version
- **Global:** `proxy_hide_header X-Powered-By` — hide upstream server info

### 4. `.env` — File Permissions 600
- **File:** `.env`
- **Change:** `chmod 600 .env`
- **Current:** `-rw-------` (owner read/write only)
- **Owner:** ubuntu:ubuntu

### 5. PostgreSQL Backup — Verified Restorable
- **Method:** `pg_dump` via Docker exec with `--no-owner --no-acl`
- **Verification:** Created test database, restored full backup, confirmed 33/33 tables
- **Test:** Cleaned up after verification

### 6. Daily Auto-Backup — Cron Activated
- **File:** `backup.sh` (enhanced)
- **Schedule:** Daily 3:37am — full backup (database + source code)
- **Weekly:** Sunday 4:07am — full backup
- **Retention:** 30 days
- **Enhancements:**
  - Uses `docker exec` for pg_dump (no host dependency)
  - Auto-loads credentials from `.env`
  - Source code backup with intelligent exclusions (.git, node_modules, media files)
  - Timestamped log output

---

## Changed Files

| File | Lines Changed | Description |
|------|---------------|-------------|
| `backup.sh` | +80 / -? | Enhanced backup: --full mode, docker exec, 30-day retention |
| `docker-compose.prod.yml` | +1 / -1 | Redis ports commented out |
| `nginx/nginx.conf` | +23 | 9 security headers + server_tokens off |

**Total:** 3 files, +91 lines, -14 lines

---

## Unchanged (Preserved)

- ✅ All API endpoints
- ✅ Database schema (Prisma / 33 tables)
- ✅ Next.js web application
- ✅ Docker images
- ✅ Business logic (LLM_MODE, SEEDANCE_MODE, video pipeline)
- ✅ AI Provider integrations (DeepSeek, Seedance)
- ✅ SSL certificates (Let's Encrypt)

---

## Verification

| # | P0 Issue | Status |
|---|----------|--------|
| 1 | Redis 不允许公网访问 | ✅ PASSED |
| 2 | UFW 仅开放 22/80/443 | ✅ PASSED |
| 3 | Nginx 安全 Headers | ✅ PASSED |
| 4 | .env 权限 600 | ✅ PASSED |
| 5 | PostgreSQL Backup 可恢复 | ✅ PASSED |
| 6 | 每日自动备份 | ✅ PASSED |

**P0 = 0 | P1 = 可保留 | P2 = 可保留**

---

## Upgrade from v1.0.0

```bash
git checkout feature/sprint-3-integrations
git pull origin feature/sprint-3-integrations
git checkout v1.0.1

# Reload nginx with new security headers
docker exec tiktok-vf-nginx nginx -t
docker exec tiktok-vf-nginx nginx -s reload

# Verify
curl -sI https://ttvideoai.com | grep -i "strict-transport-security"
curl -s https://ttvideoai.com/api/health
```

---

## Next Steps

See `ROADMAP.md` for v1.1.0 plans.
