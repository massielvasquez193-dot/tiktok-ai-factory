# TikTok AI Video Factory

> 企业级 TikTok 带货 AI 视频自动化生产 SaaS 平台

---

## 快速开始

```bash
# 开发环境
npm install
docker compose up -d
npm run dev

# 生产部署
cp .env.example .env
nano .env
chmod +x deploy-prod.sh
./deploy-prod.sh
```

## 访问地址

| 服务 | URL |
|---|---|
| 前端 | `http://localhost:3000` |
| API | `http://localhost:4000/api/health` |
| 管理后台 | `http://localhost:3000/admin` |
| 账户设置 | `http://localhost:3000/settings` |

## 技术栈

| 层级 | 技术 |
|---|---|
| Frontend | Next.js 15 + React 19 + Tailwind CSS + Recharts |
| Backend | Express.js + TypeScript + Prisma ORM |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis 7 + BullMQ |
| Payments | Stripe (Checkout + Webhook + Customer Portal) |
| Auth | JWT (Access + Refresh Token) + bcryptjs |
| Infrastructure | Docker + Nginx + PM2 + Let's Encrypt |
| CDN/Security | Cloudflare |

## 功能模块

- 🤖 AI 视频自动生成 (Seedance/Kling/Veo)
- 🌍 多语言支持
- 💳 Stripe 订阅 + 信用包支付
- 🏢 多租户 SaaS 架构
- 📊 实时 Admin 仪表盘 (Recharts 图表)
- 🔒 JWT 认证 + RBAC 三级权限
- 📦 Docker 一键部署 + 自动备份 + SSL

## 文档

| 文档 | 说明 |
|---|---|
| [docs/DEPLOY_GUIDE.md](docs/DEPLOY_GUIDE.md) | 完整部署文档 |
| [docs/CLIENT_DELIVERY.md](docs/CLIENT_DELIVERY.md) | 客户交付文档 |
| [docs/API_REPORT.md](docs/API_REPORT.md) | API 端点清单 |
| [docs/FINAL_SECURITY_AUDIT.md](docs/FINAL_SECURITY_AUDIT.md) | 安全审计报告 |
| [docs/STRIPE_REPORT.md](docs/STRIPE_REPORT.md) | Stripe 模块文档 |
| [docs/ADMIN_REPORT.md](docs/ADMIN_REPORT.md) | 管理后台文档 |
| [CHANGELOG.md](CHANGELOG.md) | 变更日志 |

## 项目结构

```
tiktok-ai-factory/
├── apps/
│   ├── server/          # Express API (TypeScript + Prisma)
│   └── web/             # Next.js Frontend
├── packages/
│   └── shared/          # 共享类型/验证
├── prisma/              # 数据库 Schema + 迁移
├── nginx/               # Nginx 配置 (SSL + WAF)
├── scripts/             # 备份/部署脚本
├── docs/                # 全部文档
├── docker-compose.yml           # 开发环境
├── docker-compose.prod.yml      # 生产环境 (7 服务)
├── deploy-prod.sh               # 一键部署
├── deploy-saas.ps1              # Windows SaaS 部署
├── ecosystem.config.js          # PM2 配置
└── .env                         # 环境变量
```

## 管理员创建

```bash
# 1. 注册普通账号后，在数据库中提升权限
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U tiktok -d tiktok_video_factory \
  -c "UPDATE users SET role='superadmin' WHERE email='admin@example.com';"
```

## License

Proprietary — All Rights Reserved
