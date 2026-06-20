# DEPLOY CHECKLIST — 腾讯云服务器部署方案

> **目标服务器**: `43.153.8.22`  
> **系统**: Ubuntu  
> **Docker**: 已安装 ✅ | **Docker Compose**: 已安装 ✅  
> **日期**: 2026-06-08

---

## 1. 项目部署文件检查

| 文件 | 状态 | 说明 |
|---|---|---|
| `docker-compose.yml` | ✅ 存在 | 开发环境 (postgres + redis) |
| `docker-compose.prod.yml` | ✅ 存在 | 生产环境 (7 服务: PG/Redis/Server×2/Web×2/Nginx/Certbot/Backup) |
| `.env` | ✅ 存在 | ⚠️ 包含占位符密钥，需替换 |
| `.env.example` | ⚠️ 过时 | 缺少 SaaS 变量，建议使用 `.env` 作为模板 |
| `.env.production` | ❌ 不存在 | 建议创建 |
| `nginx/nginx.conf` | ✅ 存在 | SSL + WAF + Rate Limit + CSP 完整 |
| `deploy-prod.sh` | ✅ 存在 | 支持 6 种操作模式 |
| `apps/server/Dockerfile.prod` | ✅ 存在 | 双阶段构建 (node:22-alpine) |
| `apps/web/Dockerfile.prod` | ✅ 存在 | 双阶段构建 (node:22-alpine) |

---

## 2. 上传方案

### 方案 A：scp 直接上传（推荐）

```bash
# 在本地 Windows 执行 (Git Bash / WSL)
cd "D:\CCTK视频\tiktok-ai-factory"

# 上传整个项目到服务器
scp -r ./* root@43.153.8.22:/opt/tiktok-vf/
```

### 方案 B：rsync 增量同步

```bash
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.next' --exclude 'dist' \
  ./ root@43.153.8.22:/opt/tiktok-vf/
```

### 方案 C：Git clone

```bash
# 先在服务器上执行 (SSH into server first)
ssh root@43.153.8.22
cd /opt
git clone <your-repo-url> tiktok-vf
```

### 上传后验证

```bash
ssh root@43.153.8.22 "ls -la /opt/tiktok-vf/"
```

---

## 3. 服务器目录结构

```
/opt/tiktok-vf/
├── docker-compose.yml              # 开发环境
├── docker-compose.prod.yml         # 生产环境 (7 services)
├── deploy-prod.sh                  # 一键部署脚本
├── deploy-saas.ps1                 # Windows 部署
├── ecosystem.config.js             # PM2 配置
├── .env                            # 生产环境变量 (需修改)
├── .env.example                    # 环境变量模板
│
├── apps/
│   ├── server/
│   │   ├── Dockerfile.prod
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # 43 表
│   │   │   └── migrations/
│   │   └── src/                    # Express API
│   └── web/
│       ├── Dockerfile.prod
│       ├── package.json
│       ├── next.config.js
│       └── src/                    # Next.js Frontend
│
├── packages/
│   └── shared/                     # 共享类型
│
├── nginx/
│   ├── nginx.conf                  # SSL + WAF + 限速
│   ├── conf.d/
│   ├── ssl/                        # SSL 证书目录
│   ├── certbot/                    # Let's Encrypt
│   └── logs/
│
├── scripts/
│   └── backup-cron.sh              # 自动备份
│
├── docs/                           # 全部文档
├── uploads/                        # 上传文件
│
├── /data/tiktok-vf/                # 持久化数据 (宿主机)
│   ├── postgres/                   # PostgreSQL 数据
│   └── redis/                      # Redis 数据
│
└── /var/log/nginx/                 # Nginx 日志
```

---

## 4. 部署命令（在服务器上执行）

### Step 1: SSH 登录

```bash
ssh root@43.153.8.22
```

### Step 2: 创建目录

```bash
mkdir -p /opt/tiktok-vf
mkdir -p /data/tiktok-vf/{postgres,redis}
chown -R 1000:1000 /data/tiktok-vf
```

### Step 3: 上传项目文件

```bash
# 从本地执行 (选一种)
scp -r D:\CCTK视频\tiktok-ai-factory\* root@43.153.8.22:/opt/tiktok-vf/
```

### Step 4: 配置环境变量

```bash
cd /opt/tiktok-vf
nano .env
```

必须修改的值：

```env
# ⚠️ 必须修改！
DB_PASSWORD=<生成强密码>
REDIS_PASSWORD=<生成强密码>
JWT_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_ENTERPRISE=price_xxx
OPENAI_API_KEY=sk-xxx
SEEDANCE_API_KEY=xxx

# ⚠️ 域名配置
DOMAIN=your-domain.com          # 替换为真实域名
APP_URL=https://your-domain.com

# ⚠️ 邮件
SMTP_PASS=re_xxx
```

### Step 5: 生成密钥

```bash
# 在服务器上执行
openssl rand -hex 32   # JWT_SECRET
openssl rand -hex 32   # JWT_REFRESH_SECRET
openssl rand -base64 24  # DB_PASSWORD
openssl rand -base64 24  # REDIS_PASSWORD
```

### Step 6: 一键部署

```bash
cd /opt/tiktok-vf
chmod +x deploy-prod.sh
./deploy-prod.sh
```

这会自动完成：
- 预检 (Docker/磁盘/内存)
- 数据库备份
- Docker 镜像构建
- 服务启动
- 数据库迁移
- 健康检查

### Step 7: 配置 SSL

```bash
./deploy-prod.sh --ssl
```

### Step 8: 创建管理员

```bash
# 1. 在浏览器注册账号: https://your-domain.com/register
# 2. SSH 到服务器提升权限:
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U tiktok -d tiktok_video_factory \
  -c "UPDATE users SET role='superadmin' WHERE email='your-email@qq.com';"
```

### Step 9: 初始化信用包

```bash
# 用管理员 token 调用
TOKEN="<从浏览器 DevTools 获取>"
curl -X POST https://your-domain.com/api/payments/admin/seed-credit-packs \
  -H "Authorization: Bearer $TOKEN"
```

### Step 10: 验证部署

```bash
./deploy-prod.sh --status
curl https://your-domain.com/api/health
```

---

## 5. 公网访问方案

### IP 直接访问（测试用）

部署完成后，在服务器上：

```bash
# 获取服务器公网 IP
curl ifconfig.me
# → 43.153.8.22
```

| 服务 | 公网访问 |
|---|---|
| 前端 | `http://43.153.8.22:3000` (需要开放 3000 端口) |
| API | `http://43.153.8.22:4000/api/health` |
| Nginx (推荐) | `http://43.153.8.22` (80 端口) |

### 腾讯云安全组开放端口

在腾讯云控制台 → 云服务器 → 安全组 → 添加入站规则：

| 端口 | 协议 | 来源 | 说明 |
|---|---|---|---|
| 22 | TCP | 你的 IP | SSH |
| 80 | TCP | 0.0.0.0/0 | HTTP (Nginx) |
| 443 | TCP | 0.0.0.0/0 | HTTPS (Nginx) |
| 5432 | TCP | 127.0.0.1 | PostgreSQL (仅本地) |
| 6379 | TCP | 127.0.0.1 | Redis (仅本地) |

> ⚠️ **不要**对外开放 5432 和 6379 端口！

---

## 6. 域名绑定方案

### DNS 配置

在域名 DNS 管理面板添加记录：

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `43.153.8.22` | 600 |
| A | `www` | `43.153.8.22` | 600 |

### 腾讯云 DNS (DNSPod)

如果域名在腾讯云：
1. 登录 `https://console.dnspod.cn`
2. 添加域名 → 添加记录
3. 记录类型: A, 主机记录: @, 记录值: 43.153.8.22

### Cloudflare DNS（推荐）

1. 域名 NS 指向 Cloudflare
2. 添加 A 记录: `@` → `43.153.8.22` (🟠 Proxied)
3. 添加 A 记录: `www` → `43.153.8.22` (🟠 Proxied)
4. SSL/TLS 模式: Full (strict)

### 验证 DNS

```bash
nslookup your-domain.com
ping your-domain.com
```

---

## 7. SSL 方案

### Let's Encrypt 免费证书（自动）

```bash
# 在服务器上执行（需要域名已解析）
DOMAIN=your-domain.com LETSENCRYPT_EMAIL=admin@your-domain.com ./deploy-prod.sh --ssl
```

此命令会：
1. 运行 certbot standalone 获取证书
2. 复制证书到 `nginx/ssl/`
3. 自动续期 (certbot 容器每 12h 检查)

### 手动验证证书

```bash
# 检查证书状态
docker compose -f docker-compose.prod.yml --profile ssl up certbot

# 查看证书到期时间
openssl s_client -connect your-domain.com:443 -servername your-domain.com 2>/dev/null | openssl x509 -noout -dates
```

### 腾讯云免费 SSL（备选）

1. 腾讯云控制台 → SSL 证书 → 申请免费证书
2. 下载 Nginx 格式
3. 上传到服务器: `/opt/tiktok-vf/nginx/ssl/`
4. 重载 Nginx: `docker compose -f docker-compose.prod.yml exec nginx nginx -s reload`

---

## 8. 部署后验证清单

在服务器上执行：

```bash
# 1. 容器状态
docker compose -f docker-compose.prod.yml ps
# 所有服务应为 Up (healthy)

# 2. API 健康
curl http://localhost:4000/api/health
# → {"status":"ok","version":"1.0.0"}

# 3. Web 响应
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# → 200

# 4. Nginx 代理
curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health
# → 200

# 5. HTTPS
curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/api/health
# → 200

# 6. 数据库连接
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U tiktok -d tiktok_video_factory -c "SELECT count(*) FROM users;"

# 7. 备份是否正常
docker compose -f docker-compose.prod.yml logs db-backup --tail=5
```

---

## 9. 需要手动完成的事项

| # | 事项 | 操作位置 |
|---|---|---|
| 1 | 替换 `.env` 中所有占位符密钥 | 服务器 `/opt/tiktok-vf/.env` |
| 2 | 配置腾讯云安全组开放 80/443 | 腾讯云控制台 |
| 3 | 域名 DNS 解析到 43.153.8.22 | DNS 管理面板 |
| 4 | 运行 SSL 配置脚本 | 服务器 `./deploy-prod.sh --ssl` |
| 5 | Stripe 生产密钥配置 | `.env` + Stripe Dashboard |
| 6 | Stripe Webhook 配置到生产 URL | Stripe Dashboard |
| 7 | 创建管理员账号 | 浏览器注册 + SQL 提升 |
| 8 | 初始化信用包 | 管理员 API 调用 |
| 9 | 配置邮件服务 (SMTP) | `.env` |

---

## 10. 常用运维命令

```bash
# 查看服务状态
./deploy-prod.sh --status

# 查看所有日志
docker compose -f docker-compose.prod.yml logs -f --tail=100

# 重启单个服务
docker compose -f docker-compose.prod.yml restart server

# 手动备份
./deploy-prod.sh --backup

# 回滚
./deploy-prod.sh --rollback

# 数据库维护
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U tiktok -d tiktok_video_factory -c "VACUUM ANALYZE;"

# 清理旧镜像
./deploy-prod.sh --cleanup
```

---

## 部署时间估算

```
上传文件:    5-10 分钟 (取决于网络)
构建镜像:    5-10 分钟
数据库迁移:  1 分钟
SSL 配置:    2 分钟
验证:        5 分钟
─────────────────────────
总计:        20-30 分钟
```
