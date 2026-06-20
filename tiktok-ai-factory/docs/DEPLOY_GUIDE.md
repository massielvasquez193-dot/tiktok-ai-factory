# TikTok AI Factory — Enterprise Production Deployment Guide

> **版本**: 1.0.0 | **目标平台**: Linux (Ubuntu 22.04+ / Debian 12+)  
> **栈**: Docker + Nginx + SSL + Cloudflare + PM2 + 自动备份

---

## 目录

1. [架构概览](#1-架构概览)
2. [服务器准备](#2-服务器准备)
3. [环境变量配置](#3-环境变量配置)
4. [Docker 部署](#4-docker-部署)
5. [Nginx + SSL 配置](#5-nginx--ssl-配置)
6. [Cloudflare 配置](#6-cloudflare-配置)
7. [PM2 进程管理](#7-pm2-进程管理)
8. [自动备份](#8-自动备份)
9. [日志监控](#9-日志监控)
10. [安全加固](#10-安全加固)
11. [运维手册](#11-运维手册)
12. [故障排查](#12-故障排查)

---

## 1. 架构概览

```
                          ┌──────────────┐
                          │  Cloudflare  │  DNS + CDN + WAF + DDoS
                          └──────┬───────┘
                                 │ :443
                                 ▼
                     ┌─────────────────────┐
                     │  Nginx              │  SSL Termination
                     │  :80 → :443 redirect│  Rate Limiting
                     │  Reverse Proxy      │  WAF Rules
                     └──────┬──────┬───────┘
                            │      │
               ┌────────────┘      └────────────┐
               ▼                                ▼
     ┌──────────────────┐           ┌──────────────────┐
     │  Web (Next.js)   │           │  Server (Express)│
     │  :3000          │           │  :4000           │
     │  Instances: 2    │           │  Instances: 2    │
     └──────────────────┘           └────────┬─────────┘
                                             │
                           ┌─────────────────┼─────────────────┐
                           ▼                 ▼                  ▼
                    ┌──────────┐    ┌──────────┐      ┌──────────┐
                    │PostgreSQL│    │  Redis   │      │  Stripe  │
                    │  :5432   │    │  :6379   │      │  (API)   │
                    │ AOF+WAL  │    │ AOF+RDB  │      └──────────┘
                    └────┬─────┘    └──────────┘
                         │
                    ┌────┴─────┐
                    │db-backup │  Every 6h → S3
                    └──────────┘
```

### 服务清单

| 服务 | 容器名 | 端口 | 副本 | 内存限制 |
|---|---|---|---|---|
| PostgreSQL 16 | `tiktok-vf-db` | 5432 | 1 | 1G |
| Redis 7 | `tiktok-vf-redis` | 6379 | 1 | 512M |
| API Server (Express) | `tiktok-vf-server` | 4000 | 2 | 2G |
| Web Frontend (Next.js) | `tiktok-vf-web` | 3000 | 2 | 1G |
| Nginx | `tiktok-vf-nginx` | 80, 443 | 1 | 256M |
| Certbot | `tiktok-vf-certbot` | — | 1 | — |
| DB Backup | `tiktok-vf-backup` | — | 1 | 128M |

---

## 2. 服务器准备

### 最小硬件要求

| 环境 | CPU | RAM | Disk |
|---|---|---|---|
| Staging | 2 vCPU | 4 GB | 40 GB SSD |
| Production | 4 vCPU | 8 GB | 100 GB SSD |
| Enterprise | 8 vCPU | 16 GB | 250 GB NVMe |

### 系统初始化 (Ubuntu 22.04)

```bash
# 1. 更新系统
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential htop nload iotop

# 2. 配置时区
sudo timedatectl set-timezone Asia/Shanghai

# 3. 配置 swap (建议 2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 4. 内核参数优化
cat <<EOF | sudo tee -a /etc/sysctl.d/99-tiktok-vf.conf
# Network
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_tw_reuse = 1
# File handles
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288
# Memory
vm.swappiness = 10
EOF
sudo sysctl --system

# 5. 文件描述符限制
cat <<EOF | sudo tee -a /etc/security/limits.conf
* soft nofile 1048576
* hard nofile 1048576
EOF
```

### 安装 Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

sudo apt install -y docker-compose-plugin

docker --version         # ≥ 27.x
docker compose version   # ≥ 2.x
```

### 安装 Node.js + PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
pm2 startup systemd
```

---

## 3. 环境变量配置

```bash
cd /opt/tiktok-vf
cp .env.example .env
nano .env
```

### 完整 `.env` 生产配置

```env
# ─── Domain ──────────────────────────────────
DOMAIN=tiktok-vf.example.com
APP_URL=https://tiktok-vf.example.com

# ─── Database ────────────────────────────────
DB_USER=tiktok
DB_PASSWORD=<RANDOM-32-CHAR-PASSWORD>
DB_NAME=tiktok_video_factory
DB_PORT=5432
DATABASE_URL="postgresql://tiktok:<PASSWORD>@postgres:5432/tiktok_video_factory"

# ─── Redis ───────────────────────────────────
REDIS_URL="redis://:<PASSWORD>@redis:6379"
REDIS_PASSWORD=<RANDOM-32-CHAR-PASSWORD>

# ─── Auth (生成: openssl rand -hex 32) ───────
JWT_SECRET=<GENERATE-WITH-OPENSSL>
JWT_REFRESH_SECRET=<GENERATE-WITH-OPENSSL>

# ─── Stripe ──────────────────────────────────
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
STRIPE_PRICE_STARTER=price_xxxxxxxxxxxx
STRIPE_PRICE_PRO=price_xxxxxxxxxxxx
STRIPE_PRICE_ENTERPRISE=price_xxxxxxxxxxxx

# ─── AI Providers ────────────────────────────
OPENAI_API_KEY=sk-xxxxxxxxxxxx
SEEDANCE_API_KEY=xxxxxxxxxxxx
KLING_API_KEY=xxxxxxxxxxxx
VEO_API_KEY=xxxxxxxxxxxx
DEEPSEEK_API_KEY=xxxxxxxxxxxx

# ─── Email ───────────────────────────────────
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxxxxxx
FROM_EMAIL=noreply@tiktok-vf.com

# ─── Let's Encrypt ───────────────────────────
LETSENCRYPT_EMAIL=admin@example.com

# ─── Backup ──────────────────────────────────
BACKUP_RETENTION_DAYS=30
S3_ENDPOINT=s3.amazonaws.com
S3_BUCKET=tiktok-vf-backups
S3_ACCESS_KEY=AKIAXXXXXXXX
S3_SECRET_KEY=xxxxxxxxxxxx

# ─── Deployment Scaling ──────────────────────
IMAGE_TAG=latest
SERVER_REPLICAS=2
WEB_REPLICAS=2
SERVER_INSTANCES=2
WORKER_INSTANCES=1

# ─── Storage paths ───────────────────────────
PGDATA_PATH=/data/tiktok-vf/postgres
REDISDATA_PATH=/data/tiktok-vf/redis
```

### 密钥生成

```bash
# JWT secrets (64 char hex each)
openssl rand -hex 32
openssl rand -hex 32

# DB passwords
openssl rand -base64 24

# Redis password
openssl rand -base64 24
```

---

## 4. Docker 部署

### 目录准备

```bash
sudo mkdir -p /data/tiktok-vf/{postgres,redis}
sudo chown -R 1000:1000 /data/tiktok-vf

mkdir -p /opt/tiktok-vf/{backups/db,nginx/{ssl,logs,certbot/{www,conf}}}
```

### 部署

```bash
cd /opt
git clone https://github.com/your-org/tiktok-ai-factory.git tiktok-vf
cd tiktok-vf

cp .env.example .env
nano .env   # 按上一节填写

chmod +x deploy-prod.sh
./deploy-prod.sh
```

### 常用 Docker 命令

```bash
# 查看服务状态
docker compose -f docker-compose.prod.yml ps

# 查看日志
docker compose -f docker-compose.prod.yml logs -f --tail=100

# 重启单个服务
docker compose -f docker-compose.prod.yml restart server

# 进入容器
docker compose -f docker-compose.prod.yml exec server sh

# 数据库连接
docker compose -f docker-compose.prod.yml exec postgres psql -U tiktok -d tiktok_video_factory

# 停止
docker compose -f docker-compose.prod.yml down

# 资源监控
docker stats --all

# 清理旧镜像
docker image prune -f --filter "until=72h"
```

---

## 5. Nginx + SSL 配置

### 首次 SSL

```bash
DOMAIN=tiktok-vf.example.com LETSENCRYPT_EMAIL=admin@example.com ./deploy-prod.sh --ssl
```

### 自动续期

Certbot 容器每 12 小时自动检查并续期：

```bash
docker compose -f docker-compose.prod.yml --profile ssl up certbot
```

### Nginx 配置要点

| 特性 | 位置 |
|---|---|
| 主配置 | `nginx/nginx.conf` (上游/SSL/WAF/限速/CSP) |
| SSL 证书 | `nginx/ssl/fullchain.pem` (LE 自动管理) |
| SSL 私钥 | `nginx/ssl/privkey.pem` |
| 日志 | `nginx/logs/access.log` (含 upstream 响应时间) |

### 速率限制

| 区域 | 限制 | 用途 |
|---|---|---|
| `auth_limit` | 5 r/s + burst 10 | 登录/注册 |
| `api_limit` | 30 r/s + burst 50 | 通用 API |
| `webhook_limit` | 60 r/s + burst 100 | Stripe webhook |

### 安全头

HSTS (2y), XSS-Protection, X-Content-Type-Options, X-Frame-Options (SAMEORIGIN), Referrer-Policy, CSP, Cross-Origin policies — 全部已内置。

---

## 6. Cloudflare 配置

### DNS

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `@` | `<SERVER-IP>` | 🟠 Proxied |
| A | `www` | `<SERVER-IP>` | 🟠 Proxied |

### SSL/TLS

```
SSL/TLS → Full (strict)
```

### 防火墙规则

```
Security → Bots → Bot Fight Mode: ON
Security → WAF → Rate limiting:
  - /api/auth/*  → 10 req/10s
  - /api/*       → 100 req/10s
```

### 缓存规则

```
/_next/static/*  → Edge TTL: 30 days
/uploads/*       → Edge TTL: 7 days
/api/*           → Bypass Cache
```

### 恢复真实 IP

```bash
# 下载 Cloudflare IP 列表
curl -s https://www.cloudflare.com/ips-v4 | sudo tee /etc/nginx/cloudflare.conf
curl -s https://www.cloudflare.com/ips-v6 | sudo tee -a /etc/nginx/cloudflare.conf

# 取消 nginx/nginx.conf 第 98-99 行注释:
# include /etc/nginx/cloudflare.conf;
# real_ip_header CF-Connecting-IP;
docker compose -f docker-compose.prod.yml restart nginx
```

---

## 7. PM2 进程管理

```bash
cd /opt/tiktok-vf

pm2 start ecosystem.config.js    # 启动
pm2 status                       # 状态
pm2 logs --lines 100             # 日志
pm2 reload ecosystem.config.js   # 零停机重载
pm2 save                         # 保存进程列表
pm2 startup systemd              # 开机自启
```

### 日志轮转

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 10
pm2 set pm2-logrotate:compress true
```

---

## 8. 自动备份

### 备份策略

| 频率 | 保留 | 存储 |
|---|---|---|
| 每 6 小时 | 本地 30 天 | `./backups/db/` |
| 每日 | S3 30 天 | `s3://bucket/backups/` |

```bash
# 查看备份日志
docker compose -f docker-compose.prod.yml logs db-backup

# 手动备份
./deploy-prod.sh --backup

# 列出备份
ls -lh ./backups/db/

# 恢复
gunzip -c ./backups/db/backup_TIMESTAMP.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U tiktok -d tiktok_video_factory

# 回滚（自动恢复备份）
./deploy-prod.sh --rollback
```

---

## 9. 日志监控

| 来源 | 位置 | 格式 |
|---|---|---|
| Nginx Access | `nginx/logs/access.log` | JSON (含 upstream time) |
| Nginx Error | `nginx/logs/error.log` | Text |
| Server App | `docker compose logs server` | JSON (50M × 10) |
| Worker | `docker compose logs` / PM2 logs | JSON |

```bash
# 实时日志
docker compose -f docker-compose.prod.yml logs -f --tail=50 server

# 错误搜索
docker compose -f docker-compose.prod.yml logs server 2>&1 | grep ERROR

# Nginx 慢请求
cat nginx/logs/access.log | jq 'select(.request_time > 2)'
```

---

## 10. 安全加固

### 已完成

- [x] TLS 1.2+ 强加密套件
- [x] HSTS 2 年 + includeSubDomains + preload
- [x] CSP 策略 (仅允许 Stripe + Cloudflare)
- [x] XSS / Clickjack / MIME 嗅探防护头
- [x] Nginx WAF (SQLi + 路径遍历 + Bot 拦截)
- [x] 三层 API 速率限制
- [x] PostgreSQL + Redis 密码 + data-checksums
- [x] JWT + Refresh Token 旋转

### 建议扩展

```bash
# UFW 防火墙
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw enable

# Fail2ban
sudo apt install -y fail2ban
sudo systemctl enable fail2ban

# 自动安全更新
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 11. 运维手册

```bash
# ========== 部署 ==========
./deploy-prod.sh                     # 完整部署
./deploy-prod.sh --status            # 服务状态
./deploy-prod.sh --cleanup           # 清理旧镜像

# ========== SSL ==========
./deploy-prod.sh --ssl               # 首次 SSL

# ========== 备份 + 回滚 ==========
./deploy-prod.sh --backup            # 手动备份
./deploy-prod.sh --rollback          # 回滚

# ========== 扩容 ==========
SERVER_REPLICAS=4 docker compose -f docker-compose.prod.yml up -d --scale server=4

# ========== 数据库维护 ==========
docker compose -f docker-compose.prod.yml exec postgres psql -U tiktok -d tiktok_video_factory -c "VACUUM ANALYZE;"

# ========== 健康检查 ==========
curl -s https://tiktok-vf.example.com/api/health | jq
docker inspect $(docker ps -q) --format '{{.Name}} {{.State.Health.Status}}'
```

---

## 12. 故障排查

### Docker 无法启动
```bash
sudo systemctl status docker     # 检查 daemon
sudo lsof -i :80 :443 :5432      # 端口占用
df -h && docker system df        # 磁盘空间
```

### 数据库连接失败
```bash
docker compose -f docker-compose.prod.yml logs postgres --tail=50
docker compose -f docker-compose.prod.yml exec postgres psql -U tiktok -d tiktok_video_factory -c "SELECT 1;"
```

### SSL 证书过期
```bash
echo | openssl s_client -servername DOMAIN -connect DOMAIN:443 2>/dev/null | openssl x509 -noout -dates
docker compose -f docker-compose.prod.yml --profile ssl up certbot
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### 内存不足
```bash
docker stats --no-stream
SERVER_REPLICAS=1 WEB_REPLICAS=1 docker compose -f docker-compose.prod.yml up -d
```

### Webhook 不工作
```bash
# 测试端点（应返回 WEBHOOK_ERROR = 端点可达）
curl -X POST https://DOMAIN/api/payments/webhook -H "Content-Type: application/json" -d '{}'
```

---

## 部署检查清单

- [ ] 服务器满足最低硬件要求
- [ ] Docker + Compose 已安装
- [ ] Node.js 22 + PM2 已安装
- [ ] `.env` 全部变量已填写
- [ ] `JWT_SECRET` + `JWT_REFRESH_SECRET` 已生成
- [ ] Stripe live keys 已配置
- [ ] SSL 证书已安装 (`./deploy-prod.sh --ssl`)
- [ ] Cloudflare DNS 已配置 (A record + proxy)
- [ ] Cloudflare SSL 模式 = Full (strict)
- [ ] `docker compose ps` 所有服务 healthy
- [ ] `curl https://domain/api/health` → `{"status":"ok"}`
- [ ] Stripe webhook 已配置到生产地址
- [ ] 备份 cron 正常 (查看 db-backup 日志)
- [ ] PM2 `startup` 已执行
- [ ] UFW 防火墙已启用

---

## 文件索引

| 文件 | 用途 |
|---|---|
| `docker-compose.prod.yml` | 7-service Docker 编排 (含资源限制/健康检查) |
| `nginx/nginx.conf` | SSL + WAF + 反向代理 + 限速 + CSP |
| `deploy-prod.sh` | 一键部署/回滚/SSL/备份/状态检查 |
| `ecosystem.config.js` | PM2 进程管理 (server + worker + scheduler) |
| `scripts/backup-cron.sh` | 自动备份脚本 (每 6h → S3) |
| `apps/server/Dockerfile.prod` | API Server 多阶段构建 |
| `apps/web/Dockerfile.prod` | Web Frontend 多阶段构建 |
