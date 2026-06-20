# CLIENT DELIVERY — TikTok AI Factory SaaS

> **交付版本**: v1.0.0 | **交付日期**: 2026-06-07

---

## 1. 项目简介

**TikTok AI Video Factory** 是一个面向跨境电商卖家的 AI 视频生产 SaaS 平台。

### 核心能力

- 🤖 AI 自动生成 TikTok 带货视频
- 🌍 多语言支持 (English/Malay/Thai/Filipino/Spanish)
- 💳 Stripe 订阅支付 + 信用包购买
- 🏢 多租户架构 (数据隔离)
- 📊 实时管理后台 + 数据图表
- 🔒 JWT 认证 + RBAC 权限

---

## 2. 系统架构图

```
┌─────────────────────────────────────────────────────┐
│                    Cloudflare                       │
│              DNS • CDN • WAF • DDoS                 │
└──────────────────────┬──────────────────────────────┘
                       │ :443
              ┌────────┴────────┐
              │     Nginx       │   SSL + WAF + Rate Limit
              └──┬──────────┬───┘
                 │          │
     ┌───────────┘          └───────────┐
     ▼                                  ▼
┌──────────┐                     ┌──────────┐
│ Next.js  │                     │ Express  │
│ :3000    │◄───────────────────►│ :4000    │
│ Frontend │                     │ Backend  │
└──────────┘                     └──┬───────┘
                                    │
               ┌────────────────────┼────────────────────┐
               ▼                    ▼                     ▼
        ┌──────────┐        ┌──────────┐         ┌──────────┐
        │PostgreSQL│        │  Redis   │         │  Stripe  │
        │  :5432   │        │  :6379   │         │  (API)   │
        └──────────┘        └──────────┘         └──────────┘
```

---

## 3. 技术栈

| 层级 | 技术 |
|---|---|
| Frontend | Next.js 15 + React 19 + Tailwind CSS + Recharts |
| Backend | Express.js + TypeScript + Prisma ORM |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis 7 + BullMQ |
| Payments | Stripe (Checkout + Webhook + Customer Portal) |
| Auth | JWT (Access + Refresh Token) + bcryptjs |
| Infrastructure | Docker + Nginx + PM2 + Let's Encrypt |
| CDN/Security | Cloudflare (DNS + WAF + DDoS) |

---

## 4. 部署方式

### 一键部署

```bash
git clone <repo-url> /opt/tiktok-vf
cd /opt/tiktok-vf
cp .env.example .env
nano .env        # 填写密钥
chmod +x deploy-prod.sh
./deploy-prod.sh
```

### Docker 服务

| 服务 | 容器名 | 端口 |
|---|---|---|
| PostgreSQL | tiktok-vf-db | 5432 |
| Redis | tiktok-vf-redis | 6379 |
| API Server | tiktok-vf-server | 4000 |
| Web Frontend | tiktok-vf-web | 3000 |
| Nginx | tiktok-vf-nginx | 80/443 |

---

## 5. 域名配置

### DNS (Cloudflare)

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | @ | `<SERVER-IP>` | 🟠 Proxied |
| A | www | `<SERVER-IP>` | 🟠 Proxied |

### SSL 配置

```bash
DOMAIN=your-domain.com LETSENCRYPT_EMAIL=admin@your-domain.com ./deploy-prod.sh --ssl
```

SSL 证书通过 Let's Encrypt 自动获取，certbot 容器每 12 小时自动续期。

---

## 6. 管理员账号创建

```bash
# 1. 在 Web 界面注册普通账号
# 2. 连接到数据库提升权限
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U tiktok -d tiktok_video_factory \
  -c "UPDATE users SET role = 'superadmin' WHERE email = 'admin@example.com';"
```

---

## 7. Stripe 配置

### 环境变量

```env
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_ENTERPRISE=price_xxx
```

### Webhook

Stripe Dashboard → Webhooks → Add endpoint:
```
https://your-domain.com/api/payments/webhook
Events: checkout.session.completed, invoice.payment_succeeded,
        invoice.payment_failed, customer.subscription.updated,
        customer.subscription.deleted, customer.subscription.paused
```

### 初始化信用包

```bash
# 管理员登录后调用
curl -X POST https://your-domain.com/api/payments/admin/seed-credit-packs \
  -H "Authorization: Bearer <admin-token>"
```

---

## 8. API 文档

### Base URL: `https://your-domain.com/api`

### Auth
```
POST   /auth/register         注册
POST   /auth/login            登录 → JWT
POST   /auth/refresh          刷新 Token
POST   /auth/logout           登出
GET    /auth/me               个人信息
```

### Payments
```
GET    /payments/plans                    订阅计划列表
POST   /payments/create-checkout          订阅支付
POST   /payments/create-credit-checkout   信用包支付
GET    /payments/subscription             订阅状态
POST   /payments/subscription/cancel      取消订阅
POST   /payments/subscription/resume      恢复订阅
POST   /payments/subscription/upgrade     升级计划
GET    /payments/history                  支付历史
```

### Credits
```
GET    /credits/balance        余额查询
GET    /credits/ledger         交易记录
POST   /credits/check          额度检查
```

### Tenant
```
GET    /tenant                租户列表
POST   /tenant                创建租户
POST   /tenant/:id/invite     邀请成员
```

**完整 API 文档**: 参见 [API_REPORT.md](API_REPORT.md)

---

## 9. 备份恢复

### 自动备份

数据库每 6 小时自动备份到 `./backups/db/`。保留 30 天。

### 手动备份

```bash
./deploy-prod.sh --backup
```

### 恢复

```bash
gunzip -c ./backups/db/backup_TIMESTAMP.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U tiktok -d tiktok_video_factory
```

### S3 远程备份

在 `.env` 中配置:
```env
S3_ENDPOINT=s3.amazonaws.com
S3_BUCKET=your-backup-bucket
S3_ACCESS_KEY=AKIAXXX
S3_SECRET_KEY=xxx
```

---

## 10. 故障排查

### 服务健康检查

```bash
./deploy-prod.sh --status
curl https://your-domain.com/api/health
```

### 查看日志

```bash
docker compose -f docker-compose.prod.yml logs -f --tail=100 server
pm2 logs --lines 100
tail -f nginx/logs/error.log
```

### 重启

```bash
docker compose -f docker-compose.prod.yml restart server
# 或零停机
pm2 reload all
```

### 回滚

```bash
./deploy-prod.sh --rollback
```

---

## 文件索引

| 文件 | 说明 |
|---|---|
| `DEPLOY_GUIDE.md` | 完整部署文档 |
| `API_REPORT.md` | API 端点清单 |
| `FINAL_SECURITY_AUDIT.md` | 安全审计报告 |
| `DATABASE_REPORT.md` | 数据库结构报告 |
| `DOCKER_REPORT.md` | Docker 配置报告 |
| `ADMIN_REPORT.md` | 管理后台报告 |
| `STRIPE_REPORT.md` | Stripe 模块报告 |

---

*交付完成 — 2026-06-07*
