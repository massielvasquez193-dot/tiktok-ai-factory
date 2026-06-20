# API REPORT — TikTok AI Factory

> **扫描日期**: 2026-06-07 | **方法**: 静态路由扫描 | **路由文件**: 34 个

---

## API 端点清单

### 🔐 Auth — `/api/auth/*`

| Method | Path | Auth | Status |
|---|---|---|---|
| POST | `/api/auth/register` | Public | ✅ |
| POST | `/api/auth/login` | Public | ✅ |
| POST | `/api/auth/refresh` | Public | ✅ |
| POST | `/api/auth/logout` | requireAuth | ✅ |
| GET | `/api/auth/me` | requireAuth | ✅ |
| POST | `/api/auth/verify-email` | Public | ✅ |
| POST | `/api/auth/send-verification` | requireAuth | ✅ |
| GET | `/api/auth/admin/users` | Admin | ✅ |
| GET | `/api/auth/admin/users/:id` | Admin | ✅ |
| PUT | `/api/auth/admin/users/:id` | Admin | ✅ |

### 💳 Payments — `/api/payments/*`

| Method | Path | Auth | Status |
|---|---|---|---|
| GET | `/api/payments/plans` | Public | ✅ |
| GET | `/api/payments/credit-packs` | Public | ✅ |
| POST | `/api/payments/create-checkout` | requireAuth | ✅ |
| POST | `/api/payments/create-credit-checkout` | requireAuth | ✅ |
| GET | `/api/payments/subscription` | requireAuth | ✅ |
| POST | `/api/payments/subscription/cancel` | requireAuth | ✅ |
| POST | `/api/payments/subscription/resume` | requireAuth | ✅ |
| POST | `/api/payments/subscription/upgrade` | requireAuth | ✅ |
| POST | `/api/payments/billing-portal` | requireAuth | ✅ |
| GET | `/api/payments/history` | requireAuth | ✅ |
| POST | `/api/payments/webhook` | Public (Stripe) | ✅ |
| POST | `/api/payments/redeem-code` | requireAuth | ✅ |
| POST | `/api/payments/admin/seed-credit-packs` | Admin | ✅ |
| GET | `/api/payments/admin/stats` | Admin | ✅ |

### 💰 Credits — `/api/credits/*`

| Method | Path | Auth | Status |
|---|---|---|---|
| GET | `/api/credits/balance` | requireAuth | ✅ |
| GET | `/api/credits/ledger` | requireAuth | ✅ |
| POST | `/api/credits/check` | requireAuth | ✅ |
| GET | `/api/credits/admin/ledger/:userId` | Admin | ✅ |
| POST | `/api/credits/admin/adjust` | Admin | ✅ |

### 🏢 Tenant — `/api/tenant/*`

| Method | Path | Auth | Status |
|---|---|---|---|
| GET | `/api/tenant` | requireAuth | ✅ |
| POST | `/api/tenant` | requireAuth | ✅ |
| PUT | `/api/tenant/:id` | requireAuth | ✅ |
| DELETE | `/api/tenant/:id` | requireAuth | ✅ |
| GET | `/api/tenant/:id/members` | requireAuth | ✅ |
| POST | `/api/tenant/:id/invite` | requireAuth | ✅ |
| DELETE | `/api/tenant/:id/members/:userId` | requireAuth | ✅ |
| GET | `/api/tenant/admin/all` | Superadmin | ✅ |
| PUT | `/api/tenant/admin/:id` | Superadmin | ✅ |

### 📊 Admin — `/api/admin/*`

| Method | Path | Auth | Status |
|---|---|---|---|
| GET | `/api/admin/stats` | Admin | ✅ |

### 📦 Business Routes (26 路由组)

| Route Group | Path | Auth | Status |
|---|---|---|---|
| Products | `/api/products` | ❌ None | ⚠️ |
| Scripts | `/api/scripts` | ❌ None | ⚠️ |
| Storyboards | `/api/storyboards` | ❌ None | ⚠️ |
| Prompts | `/api/prompts` | ❌ None | ⚠️ |
| Video Tasks | `/api/video-tasks` | ❌ None | ⚠️ |
| Videos | `/api/videos` | ❌ None | ⚠️ |
| Providers | `/api/providers` | ❌ None | ⚠️ |
| Assets | `/api/assets` | ❌ None | ⚠️ |
| Research | `/api/research` | ❌ None | ⚠️ |
| Campaigns | `/api/campaigns` | ❌ None | ⚠️ |
| Campaigns V2 | `/api/campaigns-v2` | ❌ None | ⚠️ |
| Proxy | `/api/proxy` | ❌ None | ⚠️ |
| Localization | `/api/localization` | ❌ None | ⚠️ |
| Asset Library | `/api/asset-library` | ❌ None | ⚠️ |
| Post Production | `/api/post-production` | ❌ None | ⚠️ |
| Publishing | `/api/publishing` | ❌ None | ⚠️ |
| Performance | `/api/performance` | ❌ None | ⚠️ |
| Knowledge | `/api/knowledge` | ❌ None | ⚠️ |
| Automation | `/api/automation` | ❌ None | ⚠️ |
| Publish | `/api/publish` | ❌ None | ⚠️ |
| Video Generator | `/api/video-generator` | ❌ None | ⚠️ |
| TikTok Connector | `/api/tiktok-connector` | ❌ None | ⚠️ |
| CEO Dashboard | `/api/ceo-dashboard` | ❌ None | ⚠️ |
| Data Center | `/api/data-center` | ❌ None | ⚠️ |
| Agent | `/api/agent` | ❌ None | ⚠️ |
| Automation Tasks | `/api/automation-tasks` | ❌ None | ⚠️ |

### General

| Method | Path | Auth | Status |
|---|---|---|---|
| GET | `/api/health` | Public | ✅ |

---

## 统计

```
总路由组:     30
  SaaS 路由:  5  (auth/payments/credits/tenant/admin)
  业务路由:  25

端点总数:     ~150+
  ✅ 已认证:  48 (SaaS + Admin)
  ⚠️ 未认证:  ~100+ (业务路由)
  ✅ 公开:    6 (health/login/register/refresh/plans/webhook)

SaaS API 端点: 48
业务 API 端点: ~100+
Admin API:     8
```

## 结论

```
┌──────────────────────────────────────────────────┐
│  ✅ SaaS 模块全部端点认证完整                       │
│  ⚠️ 业务路由 (26 组) 全部缺少 requireAuth         │
│  ⚠️ 业务路由全部缺少 tenantId 过滤                │
│  ✅ Stripe Webhook 签名验证 + 去重                 │
│  ✅ Admin 路由 role 检查完整                       │
└──────────────────────────────────────────────────┘
```
