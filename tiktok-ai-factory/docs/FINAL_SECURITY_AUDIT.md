# FINAL SECURITY AUDIT — TikTok AI Factory

> **审计日期**: 2026-06-07  
> **审计类型**: 代码安全审计 + 渗透测试视角  
> **严重等级**: 🔴 Critical | 🟡 High | 🟠 Medium | 🟢 Low

---

## 审计摘要

| 类别 | 结果 | 问题数 |
|---|---|---|
| TypeScript 编译 | ✅ 0 errors | 0 |
| JWT 实现 | 🟡 1 High | 1 |
| Stripe 安全 | ✅ Passed | 0 |
| SQL 注入 | ✅ Passed | 0 |
| XSS | ✅ Passed | 0 |
| CSRF | 🟡 1 High | 1 |
| 权限控制 (SaaS路由) | ✅ Passed | 0 |
| 权限控制 (业务路由) | 🔴 1 Critical | 1 |
| 租户数据隔离 | 🔴 1 Critical | 1 |
| 密码安全 | ✅ Passed | 0 |
| 错误信息泄露 | 🟡 1 Medium | 1 |
| 依赖安全性 | 🟡 1 Medium | 1 |

**总分**: 72/100 — **需修复 Critical 问题后上线**

---

## 1. JWT 实现审计

### ✅ 正确做法

- bcryptjs 10 rounds 哈希 — 符合 OWASP 建议 ✅
- Access Token (15min) + Refresh Token (7d) 旋转 ✅
- Refresh Token 使用后立即作废并签发新 Token ✅
- Token 存储在 User 表中用于服务端吊销 ✅
- JWT payload 不含敏感信息 (仅 userId/email/role/tenantId) ✅

### 🟡 问题

| # | 问题 | 严重度 | 位置 |
|---|---|---|---|
| JWT-1 | JWT_SECRET 有硬编码回退 `'tiktok-vf-dev-secret-change-in-production'` | 🟡 High | `auth.service.ts:6` |
| JWT-2 | 无登录失败速率限制 (brute-force 风险) | 🟡 High | `auth/index.ts:27` |
| JWT-3 | 无 token 过期时间配置抽取到 .env | 🟠 Low | `auth.service.ts:8-9` |

**修复**: 生产环境必须移除硬编码回退值，改为启动时检查 JWT_SECRET 是否配置：

```typescript
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'tiktok-vf-dev-secret-change-in-production') {
  throw new Error('JWT_SECRET must be set in production');
}
```

---

## 2. Stripe 安全审计

### ✅ 全部通过

- Webhook 签名验证 (`stripe.webhooks.constructEvent`) ✅
- Webhook 事件去重 (内存 Set) ✅
- Raw body 中间件在 json() 之前挂载 ✅
- API 版本使用真实版本 (`2026-05-27.dahlia`) ✅
- Checkout Session 使用 idempotency key ✅
- `stripeCustomerId` 存储用于后续操作 ✅
- 所有 Stripe 操作需要认证 (除 webhook) ✅

---

## 3. SQL 注入审计

### ✅ 全部通过

- 全项目 0 处 `$queryRaw` / `$executeRaw` 调用 ✅
- 所有查询使用 Prisma 参数化查询 ✅
- 搜索功能使用 Prisma `contains` + `mode: 'insensitive'` 无拼接 ✅
- `orderBy` 使用静态字符串无动态拼接 ✅

---

## 4. XSS 审计

### ✅ 全部通过

- 前端 0 处 `dangerouslySetInnerHTML` ✅
- 0 处 `innerHTML` / `document.write` ✅
- Next.js 默认 JSX 转义防止反射型 XSS ✅
- API 响应均为 `application/json` 不会被浏览器解析为 HTML ✅

---

## 5. CSRF 审计

### 🟡 问题

| # | 问题 | 严重度 | 位置 |
|---|---|---|---|
| CSRF-1 | 所有 API 使用 Bearer Token 认证 — 天然免疫 CSRF | 🟢 | — |
| CSRF-2 | Next.js 表单未使用 CSRF Token | 🟡 Medium | login/register pages |

**分析**: REST API 使用 `Authorization: Bearer` header，浏览器不会自动附加，因此免疫传统 CSRF。但登录/注册页作为 Next.js 客户端表单，若未来添加 Server Actions 需实现 CSRF 保护。

---

## 6. 权限控制审计

### 🔴 Critical: 业务路由无认证

**所有 25+ 业务路由文件无任何认证中间件**:

```
apps/server/src/routes/
  products.ts, scripts.ts, storyboards.ts, prompts.ts,
  videoTasks.ts, videos.ts, providers.ts, assets.ts,
  research.ts, campaigns.ts, campaignsV2.ts, proxy.ts,
  localization.ts, assetLibrary.ts, postProduction.ts,
  publishing.ts, performance.ts, knowledge.ts,
  automation.ts, publish.ts, videoGenerator.ts,
  tiktokConnector.ts, ceoDashboard.ts, dataCenter.ts,
  agent.ts, automationTasks.ts
→ 0/26 使用 requireAuth
```

### ✅ SaaS 路由认证完整

| 路由组 | requireAuth | requireRole |
|---|---|---|
| `/api/auth/*` (非 auth 端点) | ✅ | ✅ (admin routes) |
| `/api/payments/*` | ✅ | ✅ (admin routes) |
| `/api/credits/*` | ✅ | ✅ (admin routes) |
| `/api/tenant/*` | ✅ | ✅ (admin routes) |
| `/api/admin/*` | ✅ | ✅ |

---

## 7. 租户数据隔离审计

### 🔴 Critical: 业务路由无租户过滤

- `req.tenantId` 在 Auth middleware 中设置 ✅
- 但没有任何业务路由消费 `req.tenantId` ❌
- `GET /api/products` 返回全局数据而非当前租户数据 ❌
- 所有 CRUD 操作无 `WHERE tenantId` 条件 ❌
- `tenantId` 已加入 Product 模型但从未在查询中使用 ❌

**这是最高优先级的修复项。**

---

## 8. 密码安全审计

- bcryptjs 10 rounds ✅
- 密码长度最低 8 字符 ✅
- 登录失败不区分"用户不存在"与"密码错误" ✅ (防止用户枚举)
- 密码未存储在任何日志中 ✅

---

## 9. 错误信息泄露

| 问题 | 严重度 |
|---|---|
| `AppError` 在生产环境返回完整错误消息 | 🟠 Medium |
| Nginx 错误页面可能泄露堆栈 | 🟠 Low |

---

## 10. 依赖安全

- `multer@1.x` — 已弃用，建议升级到 v2
- `uuid@10` — 已弃用警告
- Prisma 可升级到 v7.8.0 (当前 v6.19.3)
- `passport` / `passport-jwt` — 已安装未使用 (冗余依赖)

---

## 安全评分

```
┌────────────────────────────────────────────┬───────┐
│ 检查项                                     │ 评分  │
├────────────────────────────────────────────┼───────┤
│ TypeScript 错误                            │ 10/10 │
│ JWT 实现                                   │ 8/10  │
│ Stripe 安全                                │ 10/10 │
│ SQL 注入防护                               │ 10/10 │
│ XSS 防护                                   │ 10/10 │
│ CSRF 防护                                  │ 8/10  │
│ 权限控制 (SaaS)                            │ 10/10 │
│ 权限控制 (业务)                            │ 0/10  │
│ 租户数据隔离                               │ 2/10  │
│ 密码安全                                   │ 10/10 │
│ 错误处理                                   │ 7/10  │
│ 依赖管理                                   │ 6/10  │
├────────────────────────────────────────────┼───────┤
│ **总分**                                   │ **72/100** │
└────────────────────────────────────────────┴───────┘
```

### 上线前必修项

1. 🔴 **业务路由加认证** — 所有路由添加 `requireAuth`
2. 🔴 **租户数据隔离** — 所有查询添加 `tenantId` 过滤
3. 🟡 **JWT 密钥验证** — 移除硬编码回退值
4. 🟡 **登录限速** — 添加 rate limiting

*审计人员: Claude Code Security Auditor | 2026-06-07*
