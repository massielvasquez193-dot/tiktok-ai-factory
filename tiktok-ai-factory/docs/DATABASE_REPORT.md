# DATABASE REPORT — TikTok AI Factory SaaS

> **日期**: 2026-06-07  
> **数据库**: PostgreSQL 16-alpine @ localhost:5432  
> **ORM**: Prisma v6.19.3  
> **迁移**: `20260607151331_init_saas_models`  

---

## 执行摘要

```
✅ Schema 检查     — 5/5 目标模型已存在，无需补齐
✅ Prisma Generate — Client v6.19.3 生成成功
✅ Prisma Migrate  — Migration 20260607151331_init_saas_models 已应用
✅ 数据库同步     — Schema ↔ Database 完全一致
```

---

## 模型盘点

### 用户指定的 5 个模型

| 模型 | Schema 定义 | 数据库表 | 状态 |
|---|---|---|---|
| **User** | L617-638 | `users` (11 列 + email 唯一索引) | ✅ |
| **Tenant** | L654-670 | `tenants` (7 列 + slug 唯一索引) | ✅ |
| **Payment** | L708-723 | `payments` (10 列) | ✅ |
| **CreditLedger** | L739-753 | `credit_ledger` (9 列) | ✅ |
| **Subscription** | L687-706 | `subscriptions` (12 列 + user_id 唯一索引) | ✅ |

> **Note**: 用户说的 "CreditLog" 对应 Schema 中的 `CreditLedger`（代码一致使用此名称）。如需重命名为 `CreditLog`，需同时修改 Schema、迁移和服务代码。

### SaaS 辅助模型 (随上述一起创建)

| 模型 | 数据库表 | 用途 |
|---|---|---|
| `EmailVerificationToken` | `email_verification_tokens` | 邮箱验证 token |
| `TenantMember` | `tenant_members` | 租户-用户关联 (含唯一约束) |
| `CreditWallet` | `credit_wallets` | 用户额度钱包 |
| `CreditPack` | `credit_packs` | 信用包产品 |

---

## 数据库结构详情

### 总表数: **43 张**

```
原有业务表 (34):
  products, product_images, scripts, storyboards, prompts,
  video_tasks, videos, assets, asset_library, research,
  campaign_records, localizations, campaign_v2, campaign_countries,
  post_productions, publishing_tasks, analytics_events,
  knowledge_hooks, knowledge_pains, knowledge_solutions,
  knowledge_ctas, knowledge_structures, knowledge_prompts,
  knowledge_videos, agent_runs, automation_jobs, automation_tasks,
  automation_logs, publish_tasks, video_performance,
  learning_insights, tiktok_data, tiktok_metrics,
  _prisma_migrations

SaaS 新增表 (9):
  users, email_verification_tokens, tenants, tenant_members,
  subscriptions, payments, credit_wallets, credit_ledger,
  credit_packs
```

### SaaS 表列结构

#### `users`
```
 id             TEXT PK
 email          TEXT UNIQUE NOT NULL
 password_hash  TEXT NOT NULL
 name           TEXT DEFAULT ''
 role           TEXT DEFAULT 'user'        -- user | admin | superadmin
 email_verified BOOLEAN DEFAULT false
 avatar_url     TEXT DEFAULT ''
 refresh_token  TEXT NULL
 last_login_at  TIMESTAMP NULL
 created_at     TIMESTAMP DEFAULT now()
 updated_at     TIMESTAMP
```

#### `tenants`
```
 id         TEXT PK
 name       TEXT NOT NULL
 slug       TEXT UNIQUE NOT NULL
 plan       TEXT DEFAULT 'free'            -- free | starter | pro | enterprise
 status     TEXT DEFAULT 'active'          -- active | suspended | cancelled
 settings   TEXT DEFAULT '{}'              -- JSON
 created_at TIMESTAMP DEFAULT now()
 updated_at TIMESTAMP
```

#### `subscriptions`
```
 id                     TEXT PK
 user_id                TEXT UNIQUE NOT NULL  → FK users(id)
 stripe_customer_id     TEXT DEFAULT ''
 stripe_subscription_id TEXT DEFAULT ''
 plan                   TEXT DEFAULT 'free'
 status                 TEXT DEFAULT 'active'
 current_period_start   TIMESTAMP NULL
 current_period_end     TIMESTAMP NULL
 cancel_at_period_end   BOOLEAN DEFAULT false
 cancelled_at           TIMESTAMP NULL
 created_at             TIMESTAMP DEFAULT now()
 updated_at             TIMESTAMP
```

#### `payments`
```
 id                TEXT PK
 subscription_id   TEXT NOT NULL  → FK subscriptions(id) CASCADE
 stripe_payment_id TEXT DEFAULT ''
 stripe_invoice_id TEXT DEFAULT ''
 amount            FLOAT DEFAULT 0
 currency          TEXT DEFAULT 'usd'
 status            TEXT DEFAULT 'succeeded'
 billing_reason    TEXT DEFAULT ''
 paid_at           TIMESTAMP NULL
 created_at        TIMESTAMP DEFAULT now()
```

#### `credit_wallets`
```
 id         TEXT PK
 user_id    TEXT UNIQUE NOT NULL  → FK users(id) CASCADE
 balance    INT DEFAULT 0
 lifetime   INT DEFAULT 0
 frozen     INT DEFAULT 0
 created_at TIMESTAMP DEFAULT now()
 updated_at TIMESTAMP
```

#### `credit_ledger`
```
 id            TEXT PK
 user_id       TEXT NOT NULL  → FK users(id) CASCADE
 amount        INT NOT NULL              -- positive = credit, negative = debit
 balance_after INT NOT NULL
 type          TEXT DEFAULT 'manual'     -- purchase | subscription | usage | refund | manual
 source        TEXT DEFAULT ''
 description   TEXT DEFAULT ''
 metadata      TEXT DEFAULT '{}'         -- JSON
 created_at    TIMESTAMP DEFAULT now()
```

#### `tenant_members`
```
 id          TEXT PK
 tenant_id   TEXT NOT NULL  → FK tenants(id) CASCADE
 user_id     TEXT NOT NULL  → FK users(id) CASCADE
 role        TEXT DEFAULT 'member'       -- owner | admin | member
 permissions TEXT DEFAULT '[]'           -- JSON array
 created_at  TIMESTAMP DEFAULT now()
 UNIQUE(tenant_id, user_id)
```

#### `email_verification_tokens`
```
 id         TEXT PK
 token      TEXT UNIQUE NOT NULL
 user_id    TEXT NOT NULL  → FK users(id) CASCADE
 type       TEXT DEFAULT 'email_verify'  -- email_verify | password_reset
 expires_at TIMESTAMP NOT NULL
 used_at    TIMESTAMP NULL
 created_at TIMESTAMP DEFAULT now()
```

#### `credit_packs`
```
 id              TEXT PK
 tenant_id       TEXT NULL  → FK tenants(id) CASCADE
 name            TEXT NOT NULL
 credits         INT DEFAULT 100
 price           FLOAT DEFAULT 9.99
 currency        TEXT DEFAULT 'usd'
 stripe_price_id TEXT DEFAULT ''
 is_active       BOOLEAN DEFAULT true
 created_at      TIMESTAMP DEFAULT now()
```

---

## 外键关系图（SaaS 部分）

```
users ──1:1──> credit_wallets
users ──1:1──> subscriptions ──1:N──> payments
users ──1:N──> credit_ledger
users ──1:N──> email_verification_tokens
users ──1:N──> tenant_members ──N:1──> tenants
                                          │
                          ┌───────────────┘
                          ▼
                    products (tenant_id FK, SET NULL on delete)
                    credit_packs (tenant_id FK, CASCADE on delete)
```

---

## Product 表扩展

`products` 表新增 `tenant_id` 列：

```
tenant_id TEXT NULL  → FK tenants(id) ON DELETE SET NULL
```

当租户被删除时，其产品不会级联删除，而是解除关联 (`SET NULL`)。

---

## 迁移文件

```
apps/server/prisma/migrations/
└── 20260607151331_init_saas_models/
    └── migration.sql    (已应用)
```

---

## 环境配置

| 配置项 | 值 | 状态 |
|---|---|---|
| DATABASE_URL | `postgresql://tiktok:tiktok_secret@localhost:5432/tiktok_video_factory` | ✅ |
| Provider | postgresql | ✅ |
| Container | tiktok-vf-db (postgres:16-alpine) | ✅ 运行中 |
| Port | 5432 | ✅ |
| Health | pg_isready | ✅ healthy |

> ⚠️ `apps/server/.env` 之前使用了 SQLite URL (`file:./dev.db`)，已修复为 PostgreSQL URL。  
> ⚠️ `docker-compose.yml` 的 `version: "3.9"` 属性已过时，建议移除。

---

## 检查结果

```
┌───────────────────────────────────────────────────┐
│  ✅ 所有 5 个目标模型均已存在于 Schema 和数据库     │
│  ✅ Prisma Client 生成成功 (v6.19.3)               │
│  ✅ Migration 成功应用 (9 张新表)                   │
│  ✅ 43 张表全部同步                                │
│  ✅ 外键约束全部正确创建                            │
│  ✅ 唯一索引全部正确创建                            │
│  ✅ Product.tenant_id FK 已添加                    │
└───────────────────────────────────────────────────┘
```
