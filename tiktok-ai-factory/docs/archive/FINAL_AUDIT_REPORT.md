# FINAL AUDIT REPORT — TikTok AI Factory SaaS

> **审计日期**: 2026-06-07  
> **审计人员**: Claude Code (资深全栈架构师)  
> **审计范围**: JWT Auth / Stripe Payments / Credits / Multi-Tenant / Admin / Prisma Schema / 编译  
> **审计方式**: 只读审查，未修改任何代码  

---

## 总览

| # | 模块 | 状态 | 完成度 |
|---|---|---|---|
| 1 | JWT 认证模块 | 🟡 半完成 | 85% |
| 2 | Stripe 支付模块 | 🟡 半完成 | 75% |
| 3 | Credits 额度系统 | 🟡 半完成 | 75% |
| 4 | Multi-Tenant 多租户 | 🔴 未完成 | 45% |
| 5 | Admin 管理后台 | 🟡 半完成 | 60% |
| 6 | Prisma Schema 匹配 | 🟢 已完成 | 100% |
| 7 | 编译错误 | 🟢 已完成 | 0 errors |
| 8 | 缺失依赖 | 🟢 已完成 | 0 missing |

---

## 1. JWT 认证模块 — 🟡 85%

### ✅ 已完成

| 功能 | 文件 | 状态 |
|---|---|---|
| 密码哈希 (bcryptjs, 10 rounds) | `auth.service.ts:21-23` | ✅ |
| Access Token (15min) + Refresh Token (7d) | `auth.service.ts:31-37` | ✅ |
| 注册 → 自动创建 Tenant + 额度钱包 | `auth.service.ts:51-104` | ✅ |
| 登录 → 返回双 Token + 租户信息 | `auth.service.ts:107-139` | ✅ |
| Token 刷新 (旋转刷新, 旧 Refresh 立即作废) | `auth.service.ts:142-174` | ✅ |
| 登出 → 撤销 Refresh Token | `auth.service.ts:177-181` | ✅ |
| Email 验证 Token 创建/验证 | `auth.service.ts:184-215` | ✅ |
| 用户资料查询 (含 wallet/subscription/memberships) | `auth.service.ts:218-233` | ✅ |
| `requireAuth` 中间件 | `auth.middleware.ts:18-32` | ✅ |
| `optionalAuth` 中间件 | `auth.middleware.ts:39-52` | ✅ |
| `requireRole` RBAC 中间件 | `auth.middleware.ts:58-67` | ✅ |
| Admin 用户搜索 (by email, case-insensitive) | `auth/index.ts:75-88` | ✅ |
| Admin 用户角色编辑 (含 superadmin 保护) | `auth/index.ts:107-122` | ✅ |
| `AppError` 类 (code/message/status) | `auth.service.ts:238-247` | ✅ |

### ❌ 未完成 / 缺失

| 缺失项 | 严重程度 | 说明 |
|---|---|---|
| **无实际 Email 发送** | 🔴 高 | `send-verification` 仅在 dev 模式返回 token，无 SMTP/SendGrid 集成。生产环境用户收不到验证邮件 |
| **无密码重置流程** | 🔴 高 | 缺少 `POST /api/auth/forgot-password` 和 `POST /api/auth/reset-password` 端点。`EmailVerificationToken.type` 支持 `password_reset` 但从未使用 |
| **无登录限速** | 🟡 中 | 无 rate-limiting 防护，暴力破解风险 |
| **JWT Secret 硬编码回退** | 🟡 中 | `tiktok-vf-dev-secret-change-in-production` 作为默认值，生产环境若未设环境变量则不安全 |
| **无账号锁定** | 🟠 低 | 连续登录失败无锁定机制 |
| **`passport`/`passport-jwt` 已安装但未使用** | 🟠 低 | 依赖冗余，项目使用手写 JWT 逻辑 |

### 🔧 建议

```typescript
// 需要新增的端点
POST /api/auth/forgot-password     // 发送重置链接
POST /api/auth/reset-password      // 验证 token + 设置新密码
POST /api/auth/change-password     // 已登录用户改密码（需旧密码确认）
```

---

## 2. Stripe 支付模块 — 🟡 75%

### ✅ 已完成

| 功能 | 文件 | 状态 |
|---|---|---|
| Plans (4 tier: free/starter/pro/enterprise) | `payments/index.ts:20-54` | ✅ |
| Credit Packs 查询 | `payments/index.ts:57-60` | ✅ |
| 订阅 Checkout (Stripe Checkout Session) | `payments/index.ts:63-113` | ✅ |
| 信用包一次性支付 | `payments/index.ts:116-155` | ✅ |
| Billing Portal (Stripe Customer Portal) | `payments/index.ts:158-173` | ✅ |
| 支付历史查询 | `payments/index.ts:176-182` | ✅ |
| Webhook 签名验证 | `payments/index.ts:188-201` | ✅ |
| Webhook: `checkout.session.completed` (订阅+信用包) | `payments/index.ts:203-256` | ✅ |
| Webhook: `invoice.payment_succeeded` (记录付款) | `payments/index.ts:259-281` | ✅ |
| Webhook: `customer.subscription.deleted` | `payments/index.ts:284-292` | ✅ |
| Stripe raw body 中间件 | `index.ts:31` | ✅ |

### ❌ 未完成 / 缺失

| 缺失项 | 严重程度 | 说明 |
|---|---|---|
| **🔴 API 版本无效** | 🔴 严重 | `apiVersion: '2025-06-30.smoke_test'` — 这不是真实的 Stripe API 版本。会导致运行时 Stripe SDK 抛错。应改为 `'2024-12-20.smoke_test'` 或动态获取最新版本 |
| **无 idempotency 键** | 🟡 中 | Checkout Session 创建无幂等键，网络重试可能导致重复扣款 |
| **Webhook 事件不完整** | 🟡 中 | 缺少 `invoice.payment_failed`（支付失败通知）、`customer.subscription.updated`（计划变更）、`customer.subscription.paused` |
| **`stripeSubId` 字段从未更新** | 🟡 中 | Subscription 表有 `stripeSubId` 字段，但 Webhook 和 Checkout 完成回调从未写入 |
| **`cancelPendingVideoTasks` 导入但未调用** | 🟡 中 | 用户取消订阅时未冻结任务/退款 |
| **无订阅升级/降级** | 🟠 低 | 无 proration 计算和计划切换 API |
| **Payments 表无 userId** | 🟠 低 | 支付记录仅关联 subscriptionId，无法直接按 user 查询 |

### 🔧 建议

```typescript
// 修复: Stripe API 版本
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',  // 使用最新稳定版
});

// 需要在 webhook 中添加:
case 'invoice.payment_failed':
  // 通知用户支付失败，暂停额度
case 'customer.subscription.updated':
  // 同步计划变更
```

---

## 3. Credits 额度系统 — 🟡 75%

### ✅ 已完成

| 功能 | 文件 | 状态 |
|---|---|---|
| 余额查询 (balance/frozen/lifetime) | `credits.service.ts:6-9` | ✅ |
| 额度检查 (hasEnoughCredits) | `credits.service.ts:12-16` | ✅ |
| 扣减额度 (deduct) | `credits.service.ts:19-46` | ✅ |
| 增加额度 (add) | `credits.service.ts:49-72` | ✅ |
| 冻结/解冻 (freeze/unfreeze) | `credits.service.ts:75-93` | ✅ |
| 账本查询 (分页) | `credits.service.ts:96-107` | ✅ |
| Admin 调整额度 | `credits.service.ts:110-119` | ✅ |
| cancelPendingVideoTasks | `credits.service.ts:127-135` | ✅ |
| 注册时自动创建钱包 (50 credits) | `auth.service.ts:80-82` | ✅ |

### ❌ 未完成 / 缺失

| 缺失项 | 严重程度 | 说明 |
|---|---|---|
| **🔴 未集成到视频生成流程** | 🔴 严重 | `freeze`/`unfreeze`/`deduct` 均未在 `videoTasks.ts` 或任何实际生成流程中调用。额度系统是孤岛 |
| **无月度额度 Renewal** | 🟡 中 | 订阅用户每月应自动刷新额度，当前无 cron 或 schedule 实现 |
| **cancelPendingVideoTasks 从未被调用** | 🟡 中 | 导入在 `payments/index.ts:6` 但无调用点 |
| **无额度不足的 HTTP 402 中间件** | 🟡 中 | 可在 middleware 层统一拦截 402 而非每个路由手动检查 |
| **无额度过期机制** | 🟠 低 | 按月订阅的额度应该每月过期旋转 |
| **`adminAdjust` 内 balanceAfter 计算可能不同步** | 🟠 低 | `adminAdjust` 调用 `add`/`deduct` 时 ledger 的 `balanceAfter` 是从 service 方法内部计算的，逻辑正确但无事务保证 |

---

## 4. Multi-Tenant 多租户 — 🔴 45%

### ✅ 已完成

| 功能 | 文件 | 状态 |
|---|---|---|
| Tenant CRUD (创建/读取/更新/删除) | `tenant/index.ts:14-88` | ✅ |
| 计划限制检查 (free=1, starter=3, pro/enterprise=∞) | `tenant/index.ts:35-41` | ✅ |
| Slug 唯一性检查 | `tenant/index.ts:31-32` | ✅ |
| 成员管理 (列表/邀请/移除) | `tenant/index.ts:90-153` | ✅ |
| Owner/admin/member 三级角色 | `tenant/index.ts:48,109,128` | ✅ |
| 权限字符串存储 (`['*']`, `['manage_members', 'manage_content']`) | `tenant/index.ts:49,129` | ✅ |
| Superadmin 全局租户管理 | `tenant/index.ts:158-176` | ✅ |
| TenantMember `@@unique([tenantId, userId])` | `schema.prisma:683` | ✅ |
| 注册时自动创建默认 Tenant | `auth.service.ts:61-67` | ✅ |
| Tenant → Product 关联 (tenantId FK) | `schema.prisma:665-666` | ✅ |

### ❌ 未完成 / 缺失

| 缺失项 | 严重程度 | 说明 |
|---|---|---|
| **🔴🔴 租户隔离中间件缺失** | 🔴 致命 | **这是最大的架构缺陷**。现有 30+ 路由 (products, scripts, storyboards, videos, campaigns, research, knowledge...) **完全没有租户过滤**。任何认证用户可以看到所有 Tenant 的数据。`req.tenantId` 已注入但从未在任何业务路由中消费 |
| **🔴 已有 CRUD 路由未集成 Tenant Scope** | 🔴 致命 | `create/read/update/delete` 操作没有 `WHERE tenantId` 条件。例如 `GET /api/products` 返回全库数据而非当前租户的 |
| **无 Tenant Middleware Factory** | 🔴 高 | 缺少类似 `tenantScope('Product')` 的中间件自动注入 `tenantId` 过滤 |
| **无租户间切换 API** | 🟡 中 | 用户无法在 Settings 页面切换到不同 Tenant |
| **无 Tenant Transfer Ownership** | 🟠 低 | 无法将 Owner 权限转给其他成员 |
| **Tenant Settings 无 Schema 验证** | 🟠 低 | `settings` 字段是自由 JSON，无校验 |
| **无审计日志** | 🟠 低 | Tenant 操作 (创建/删除/成员变更) 无审计记录 |

### 🔧 建议 (架构修复)

```typescript
// 需要新增: apps/server/src/tenant/tenant.middleware.ts
export function tenantScope(model: string) {
  return (req, res, next) => {
    // 自动将 req.tenantId 注入到查询条件
    req.tenantFilter = { tenantId: req.tenantId };
    next();
  };
}

// 然后在所有业务路由上:
app.use('/api/products', requireAuth, tenantScope('Product'), productRoutes);
```

---

## 5. Admin 管理后台 — 🟡 60%

### ✅ 已完成

| 页面 | 文件 | 状态 |
|---|---|---|
| 登录页 (email/password 表单) | `app/login/page.tsx` | ✅ |
| 注册页 (name/email/password) | `app/register/page.tsx` | ✅ |
| 账户设置 (Profile/Credits/Billing/Logout) | `app/settings/page.tsx` | ✅ |
| Admin 仪表盘 (统计卡片 + 功能入口) | `app/admin/page.tsx` | ✅ |
| 用户管理 (搜索 + 角色下拉) | `app/admin/users/page.tsx` | ✅ |
| 租户管理 (表格展示) | `app/admin/tenants/page.tsx` | ✅ |
| 额度管理 (手动调整表单) | `app/admin/credits/page.tsx` | ✅ |
| 支付管理 (Stripe 链接) | `app/admin/payments/page.tsx` | ✅ |
| AuthContext (全局状态) | `context/AuthContext.tsx` | ✅ |
| Sidebar Admin 入口 + User 信息 | `components/Sidebar.tsx` | ✅ |
| 未登录自动 redirect to /login | 所有 admin 页面 | ✅ |
| 非 admin 角色 redirect to /login | 所有 admin 页面 | ✅ |

### ❌ 未完成 / 缺失

| 缺失项 | 严重程度 | 说明 |
|---|---|---|
| **仪表盘数据为硬编码占位符** | 🟡 中 | "Coming soon" 文字而非动态 API 数据（仅 users count 实时） |
| **租户管理页无操作按钮** | 🟡 中 | 无 Edit/Suspend/Delete/Change Plan 按钮，纯只读表格 |
| **支付管理页仅为占位符** | 🟡 中 | 仅显示"Open Stripe Dashboard"链接，无订阅列表/支付记录表格 |
| **额度管理需手动输入 UUID** | 🟡 中 | 无法按 email 搜索用户，需手动粘贴 UUID |
| **无 Toast/通知系统** | 🟠 低 | 操作反馈依赖 alert 或文字，无统一 notification |
| **无 Loading States (Skeleton)** | 🟠 低 | 加载中仅显示 "Loading..." 文字 |
| **无分页** | 🟠 低 | 用户列表最多100条，无分页控件 |
| **No `router.push('/login')` 在 AuthContext login 中** | 🟠 低 | 登录页面成功后需要手动跳转，AuthContext 不自动跳转 |
| **无 Middleware (next.js 12+ 路由保护)** | 🟡 中 | 所有保护在 `useEffect` 中，页面会先闪烁渲染再跳转；可用 `middleware.ts` 在服务端拦截 |

---

## 6. Prisma Schema 匹配性 — 🟢 100%

### ✅ 验证结果

**SaaS 模型字段对齐检查** (Code → Schema):

| 模型 | 代码使用字段 | Schema 匹配 |
|---|---|---|
| User | `id, email, passwordHash, name, role, emailVerified, avatarUrl, refreshToken, lastLoginAt` | ✅ 全部匹配 |
| Tenant | `id, name, slug, plan, status, settings` | ✅ 全部匹配 |
| TenantMember | `id, tenantId, userId, role, permissions` | ✅ 全部匹配 |
| Subscription | `id, userId, stripeCustomerId, stripeSubId, plan, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, cancelledAt` | ✅ 全部匹配（stripeSubId 写入缺失见 Stripe 章节） |
| Payment | `id, subscriptionId, stripePaymentId, stripeInvoiceId, amount, currency, status, billingReason, paidAt` | ✅ 全部匹配 |
| CreditWallet | `id, userId, balance, lifetime, frozen` | ✅ 全部匹配 |
| CreditLedger | `id, userId, amount, balanceAfter, type, source, description, metadata` | ✅ 全部匹配 |
| CreditPack | `id, tenantId, name, credits, price, currency, stripePriceId, isActive` | ✅ 全部匹配 |
| EmailVerificationToken | `id, token, userId, type, expiresAt, usedAt` | ✅ 全部匹配 |
| Product (扩展) | `tenantId` (新增) | ✅ 已添加 |

**Prisma `@map` 映射**: 所有 `snake_case` 数据库字段 → `camelCase` 代码属性均已正确映射 ✅

**关系完整性**:
- `User` ↔ `TenantMember` ↔ `Tenant` ✅
- `User` → `Subscription` → `Payment` ✅
- `User` → `CreditWallet` ✅
- `User` → `CreditLedger` ✅
- `Tenant` → `Product` ✅
- `Tenant` → `CreditPack` ✅

**索引**:
- `TenantMember.@@unique([tenantId, userId])` — 防止重复加入 ✅
- `User.email @unique` ✅
- `Tenant.slug @unique` ✅
- `CreditWallet.userId @unique` ✅
- `Subscription.userId @unique` ✅

---

## 7. 编译错误 — 🟢 零错误

| 检查项 | 命令 | 结果 |
|---|---|---|
| Server TypeScript | `npx tsc --noEmit` (apps/server) | ✅ 0 errors |
| Web TypeScript | `npx tsc --noEmit` (apps/web) | ✅ 0 errors |
| Prisma Client 生成 | `npm run db:generate` | ✅ 成功 |

---

## 8. 缺失依赖 — 🟢 零缺失

### 已安装关键包

| 包名 | 版本来源 | 状态 |
|---|---|---|
| `jsonwebtoken` | package.json (root) | ✅ 已安装 |
| `stripe` | package.json (root) | ✅ 已安装 |
| `bcryptjs` | package.json (root) | ✅ 已安装 |
| `passport` / `passport-jwt` | package.json (root) | ⚠️ 已安装但未使用 (冗余) |
| `swagger-jsdoc` / `swagger-ui-express` | package.json (root) | ⚠️ 已安装但未使用 (未配置 Swagger) |
| `uuid` | package.json (root) | ✅ 用于 email token 生成 |
| `@prisma/client` | apps/server | ✅ |
| `next` `react` `react-dom` | apps/web | ✅ |
| `vitest` `supertest` | apps/server (devDeps) | ✅ 用于集成测试 |

### 未使用的冗余包

| 包名 | 建议 |
|---|---|
| `passport` / `passport-jwt` | 项目使用手写 JWT，这两个包可以移除或改用 `passport-jwt` 策略 |
| `swagger-jsdoc` / `swagger-ui-express` | 未在任何地方 `require` 或配置，可以移除或集成到 `index.ts` |

---

## 综合评分

```
┌──────────────────────────────────────┬───────────┬──────────┐
│ 维度                                 │ 得分      │ 评级     │
├──────────────────────────────────────┼───────────┼──────────┤
│ 代码质量 (TypeScript 零错误)          │ 10/10     │ ⭐⭐⭐⭐⭐ │
│ JWT 认证完整性                       │ 8.5/10    │ ⭐⭐⭐⭐  │
│ Stripe 支付完整性                    │ 7.5/10    │ ⭐⭐⭐⭐  │
│ Credits 额度完整性                   │ 7.5/10    │ ⭐⭐⭐⭐  │
│ Multi-Tenant 完整性                  │ 4.5/10    │ ⭐⭐      │
│ Admin 后台完整性                     │ 6.0/10    │ ⭐⭐⭐    │
│ Schema 匹配性                        │ 10/10     │ ⭐⭐⭐⭐⭐ │
│ 生产就绪度                           │ 5.0/10    │ ⭐⭐½     │
├──────────────────────────────────────┼───────────┼──────────┤
│ **总体**                             │ **7.4/10** │ **⭐⭐⭐½** │
└──────────────────────────────────────┴───────────┴──────────┘
```

---

## 优先级修复路线图

### 🔴 P0 — Production Blocker (必须立即修复)

| # | 问题 | 影响 |
|---|---|---|
| 1 | **Multi-Tenant 路由隔离**: 30+ 路由无 tenantId 过滤 | 数据泄露 — 所有用户可见彼此数据 |
| 2 | **Stripe API 版本无效**: `2025-06-30.smoke_test` 不存在 | Stripe SDK 运行时崩溃 |
| 3 | **额度系统未集成**: freeze/deduct 未在视频生成流程中调用 | 用户可无限使用 |

### 🟡 P1 — 高优先级 (SaaS 上线必备)

| # | 问题 |
|---|---|
| 4 | Email 实际发送 (SMTP/SendGrid) |
| 5 | 密码重置流程 |
| 6 | 登录 rate limiting |
| 7 | Webhook 事件补全 (`invoice.payment_failed` 等) |
| 8 | Admin 页面功能补全 (租户操作、支付记录、用户搜索) |

### 🟢 P2 — 增强 (提升体验)

| # | 问题 |
|---|---|
| 9 | 月度额度自动 Renewal |
| 10 | JWT Secret 环境变量验证 |
| 11 | 订阅升级/降级 API |
| 12 | 前端 Loading States + 分页 |
| 13 | Next.js middleware 路由保护 |
| 14 | Swagger API 文档集成 |

---

*审计完成。所有发现基于 2026-06-07 的代码库状态，未进行任何代码修改。*
