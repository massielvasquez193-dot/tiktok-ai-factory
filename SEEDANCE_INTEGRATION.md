# Seedance AI 视频生成 — 完整接入文档

## TikTok AI Factory · 视频生成模块

**版本:** 2.1  
**日期:** 2026-06-06  
**Provider:** Seedance (火山引擎 Ark / 豆包 Seedance)  
**当前状态:** Mock 模式（未配置真实 API Key）

---

## 目录

1. [架构概览](#1-架构概览)
2. [配置位置](#2-配置位置)
3. [API Key 配置](#3-api-key-配置)
4. [Mock / 真实模式切换](#4-mock--真实模式切换)
5. [完整 API 工作流](#5-完整-api-工作流)
6. [测试方法](#6-测试方法)
7. [API 端点参考](#7-api-端点参考)
8. [故障排除](#8-故障排除)

---

## 1. 架构概览

```
┌──────────────────────────────────────────────────────────┐
│                    前端 (Next.js :3000)                    │
│   /providers  →  Seedance 管理面板                        │
│   /video-generator → 视频生成器                            │
│   /agent → AI Agent 自动化                                 │
└──────────────────────┬───────────────────────────────────┘
                       │ HTTP
┌──────────────────────▼───────────────────────────────────┐
│                 API Server (Express :4000)                 │
│                                                           │
│  ┌─────────────────────────────────────────────────┐     │
│  │           ProviderManager (单例)                  │     │
│  │  seedance ─── SeedanceProvider                   │     │
│  │  kling    ─── KlingProvider  (仅 Mock 桩)        │     │
│  │  veo      ─── VeoProvider    (仅 Mock 桩)        │     │
│  └────────────────────┬────────────────────────────┘     │
│                       │                                    │
│  ┌────────────────────▼────────────────────────────┐     │
│  │           SeedanceProvider                       │     │
│  │  _mode: 'real' | 'mock'   ← 关键开关             │     │
│  │  _realCreate()  → 火山引擎 Ark API               │     │
│  │  _mockCreate()  → 本地模拟数据                    │     │
│  │  _realStatus()  → 轮询任务状态                   │     │
│  │  _mockStatus()  → 模拟进度                       │     │
│  │  _realDownload()→ HTTP 下载视频                  │     │
│  │  _mockDownload()→ 模拟下载                        │     │
│  └────────────────────┬────────────────────────────┘     │
│                       │ HTTPS                              │
│  ┌────────────────────▼────────────────────────────┐     │
│  │     火山引擎 Ark API (外部)                       │     │
│  │     ark.cn-beijing.volces.com                    │     │
│  │     /api/v3/contents/generations/tasks           │     │
│  └─────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

### 支持的 Provider 对比

| Provider | 真实 API 实现 | Mock 模式 | 模型 | 状态 |
|----------|:-----------:|:--------:|------|------|
| **Seedance** | ✅ 完整实现 | ✅ | doubao-seedance-2-0-260128 | **可用** |
| Kling | ❌ 仅桩代码 | ✅ | kling-v1-5 | 待开发 |
| Veo | ❌ 仅桩代码 | ✅ | veo-2.0 | 待开发 |

> **Seedance 是当前唯一可投入生产的视频生成 Provider。**

---

## 2. 配置位置

### 2.1 环境变量文件

| 文件 | 用途 | 优先级 |
|------|------|:----:|
| `apps/server/.env` | **服务端运行时配置（主要）** | 🥇 最高 |
| `.env` | 项目根配置（Docker/通用） | 🥈 |
| `.env.production` | Docker 生产模式配置 | 🥉 |
| `.env.example` | 新项目模板 | — |

### 2.2 核心源码文件

| 文件 | 角色 |
|------|------|
| `apps/server/src/providers/seedance/SeedanceProvider.ts` | **Seedance Provider 核心实现** |
| `apps/server/src/providers/manager/ProviderManager.ts` | **Provider 管理器（单例）** |
| `apps/server/src/providers/interfaces/IVideoProvider.ts` | Provider 接口定义 |
| `apps/server/src/providers/index.ts` | 模块导出 |
| `apps/server/src/routes/providers.ts` | Provider REST API |
| `apps/server/src/routes/videoGenerator.ts` | 视频生成器路由 |
| `apps/server/src/routes/videoTasks.ts` | 视频任务管理 |

### 2.3 环境变量完整列表

```env
# ═══ 必填 ═══════════════════════════════════════════════════════════
SEEDANCE_API_KEY=          # 火山引擎 API Key（不填 = Mock 模式）

# ═══ 可选（有默认值） ═══════════════════════════════════════════════
SEEDANCE_BASE_URL=https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks

# ═══ 其他 AI Provider（当前仅 Mock 桩） ═════════════════════════════
KLING_API_KEY=
KLING_BASE_URL=https://api.kling.kuaishou.com/v1/videos/text2video
VEO_API_KEY=
VEO_BASE_URL=https://videogeneration.googleapis.com/v1/projects/my-project:generateVideo
OPENAI_API_KEY=
TTS_ENGINE=azure
TTS_API_KEY=
TTS_REGION=southeastasia
```

### 2.4 配置读取链路

```
apps/server/.env
    │
    ▼
process.env.SEEDANCE_API_KEY      ← Node.js 全局环境变量
    │
    ├──▶ ProviderManager.ts:18     → new SeedanceProvider({ apiKey: process.env.SEEDANCE_API_KEY })
    │
    ├──▶ SeedanceProvider.ts:17    → const apiKey = process.env.SEEDANCE_API_KEY || ''
    │       │
    │       ├── apiKey 有值 → this._mode = 'real'
    │       └── apiKey 为空 → this._mode = 'mock'
    │
    └──▶ videoGenerator.ts:27,89   → const API_KEY = process.env.SEEDANCE_API_KEY || ''
            │
            ├── API_KEY 有值 → 直接调用火山引擎 API
            └── API_KEY 为空 → 跳过真实 API 调用
```

---

## 3. API Key 配置

### 3.1 获取 API Key

1. 访问 [火山引擎 Ark 平台](https://www.volcengine.com/product/ark)
2. 注册/登录火山引擎账号
3. 进入 **Ark > API 密钥管理**
4. 创建 API Key，格式如：`ark-c88b6c8c-e2aa-400c-ba52-a9d7648383cc-9c0d5`
5. 开通 **豆包 Seedance** 模型服务

### 3.2 配置 API Key

**编辑文件：** `apps/server/.env`

```env
# 修改前（Mock 模式）
SEEDANCE_API_KEY=

# 修改后（真实模式）
SEEDANCE_API_KEY=ark-c88b6c8c-e2aa-400c-ba52-a9d7648383cc-9c0d5
```

**同时更新生产配置：** `.env.production`

```env
SEEDANCE_API_KEY=ark-c88b6c8c-e2aa-400c-ba52-a9d7648383cc-9c0d5
SEEDANCE_BASE_URL=https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks
```

### 3.3 配置后重启

```powershell
# 停止当前进程
# Ctrl+C 终止 npm run dev

# 重新启动
npm run dev
```

启动日志变化：
```
# Mock 模式（无 Key）
[SeedanceProvider] Mode: mock (set SEEDANCE_API_KEY in .env to enable real API)

# 真实模式（有 Key）
[SeedanceProvider] Mode: real
```

---

## 4. Mock / 真实模式切换

### 4.1 切换机制

切换是**自动的**，无需修改代码，完全由 `SEEDANCE_API_KEY` 是否为空决定。

```typescript
// SeedanceProvider.ts:29 — 唯一的判断逻辑
this._mode = apiKey ? 'real' : 'mock';
```

| SEEDANCE_API_KEY | 模式 | createTask | getStatus | downloadResult |
|:---:|:---:|---|---|---|
| 空字符串 `""` | **Mock** | 模拟创建，返回假 taskId | 模拟进度 0→100% | 模拟下载 |
| 有值 `ark-xxx` | **Real** | POST 火山引擎 API | GET 火山引擎任务状态 | HTTP 下载真实视频 |

### 4.2 Mock 模式行为

```typescript
// 模拟创建 → 返回假 taskId
// 模拟轮询 → 2~8 秒内进度 0→100%
// 8% 概率模拟失败（内容审核拦截）
// 模拟下载 → 不产生真实文件
```

Mock 模式的视频 URL 格式：`https://storage.mock/seedance/{taskId}.mp4`

### 4.3 真实模式行为

```typescript
// POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks
// 请求体：
{
  "model": "doubao-seedance-2-0-260128",
  "content": [{ "type": "text", "text": "<prompt>" }],
  "resolution": "720p",
  "ratio": "9:16",
  "duration": 5,
  "generate_audio": false,
  "watermark": false
}

// 轮询 GET {baseUrl}/{taskId} 每 5 秒
// 状态: queued → running → succeeded / failed

// 下载 → HTTP GET video_url → 本地 MP4 文件
```

---

## 5. 完整 API 工作流

### 5.1 单个视频生成

```
1. 前端 POST /api/providers/seedance/create
   Body: { "promptId": "uuid" }
   ↓
2. ProviderManager.submit(promptId, 'seedance')
   ↓ 查找 prompt + storyboard + script + product
   ↓ 创建 VideoTask 记录 (status: pending)
   ↓
3. SeedanceProvider.createTask({ prompt, negativePrompt, ... })
   ↓ Real: POST 火山引擎 API → 返回 taskId
   ↓ Mock: 生成本地假 taskId
   ↓ 更新 VideoTask (status: submitted → processing)
   ↓
4. 启动轮询 (每 5 秒)
   ↓ SeedanceProvider.getStatus(taskId)
   ↓ 更新 VideoTask.progress
   ↓
5. 任务完成 (status: completed)
   ↓ SeedanceProvider.downloadResult(videoUrl, outputPath)
   ↓ 保存到 output/videos/seedance/{id}.mp4
   ↓ 更新 VideoTask (videoUrl, thumbnailUrl, duration)
```

### 5.2 批量视频生成

```
POST /api/providers/submit-batch
Body: { "promptIds": ["id1", "id2", ...] }
→ 每个 prompt 独立走 5.1 流程
→ 返回所有 dbTaskId
```

### 5.3 全自动化流水线

```
POST /api/video-generator/run
Body: { "productId": "uuid", "countries": "US,MY", "scriptCount": 3 }
→ 7 步全自动：
  1. Research  → 竞品分析
  2. Knowledge → 知识库查询
  3. Scripts   → 生成脚本
  4. Prompts   → 生成分镜提示词
  5. Video     → 调用 Seedance 生成视频 ★
  6. Post      → 后期制作
  7. Sync      → 同步到视频库
```

---

## 6. 测试方法

### 6.1 验证当前模式

```powershell
# 查看启动日志确认模式
npm run dev 2>&1 | Select-String "SeedanceProvider"
```

输出：
```
# Mock 模式
[SeedanceProvider] Mode: mock (set SEEDANCE_API_KEY in .env to enable real API)

# 真实模式
[SeedanceProvider] Mode: real
```

### 6.2 查看可用 Provider

```powershell
curl http://localhost:4000/api/providers
```

返回：
```json
{
  "count": 3,
  "providers": [
    { "name": "seedance", "model": "doubao-seedance-2-0-260128", "baseUrl": "https://ark.cn-beijing.volces.com/..." },
    { "name": "kling", "model": "kling-v1-5", "baseUrl": "https://api.kling.kuaishou.com/..." },
    { "name": "veo", "model": "veo-2.0", "baseUrl": "https://videogeneration.googleapis.com/..." }
  ]
}
```

### 6.3 Mock 模式测试（无需 API Key）

```powershell
# 1. 先获取一个 promptId
curl -s http://localhost:4000/api/prompts | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else 'no prompts')"

# 2. 提交视频生成任务
curl -X POST http://localhost:4000/api/providers/seedance/create \
  -H "Content-Type: application/json" \
  -d '{"promptId": "<上面获取的 promptId>"}'

# 3. 查看任务状态
curl http://localhost:4000/api/providers/seedance/tasks

# 4. 查看任务详情（替换 taskId）
curl http://localhost:4000/api/video-tasks
```

### 6.4 真实模式测试（需要 API Key）

```powershell
# 确认 Key 已配置
cat apps/server/.env | grep SEEDANCE_API_KEY
# → SEEDANCE_API_KEY=ark-xxx  (必须有值)

# 重启服务
# Ctrl+C 停止 → npm run dev

# 确认启动日志
# → [SeedanceProvider] Mode: real

# 提交真实生成任务
curl -X POST http://localhost:4000/api/providers/seedance/create \
  -H "Content-Type: application/json" \
  -d '{"promptId": "<prompt-uuid>"}'

# 轮询查看任务进度（每 5 秒）
curl http://localhost:4000/api/video-tasks

# 完成后检查本地文件
dir .\output\videos\seedance\
```

### 6.5 直接 API 测试（绕过 Provider Manager）

```powershell
curl -X POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks \
  -H "Authorization: Bearer ark-YOUR-KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "doubao-seedance-2-0-260128",
    "content": [{"type": "text", "text": "A woman holding skincare product, 9:16 vertical, UGC style, natural lighting, 4K"}],
    "resolution": "720p",
    "ratio": "9:16",
    "duration": 5
  }'
```

---

## 7. API 端点参考

### 7.1 Provider 管理

| 方法 | URL | 说明 |
|------|-----|------|
| GET | `/api/providers` | 列出所有 Provider |
| GET | `/api/providers/stats` | 活跃轮询数 |
| POST | `/api/providers/:name/create` | 提交视频生成 |
| POST | `/api/providers/submit-batch` | 批量提交 |
| GET | `/api/providers/:name/tasks` | 查看任务列表 |
| POST | `/api/providers/:name/tasks/:id/retry` | 重试失败任务 |
| POST | `/api/providers/:name/tasks/:id/cancel` | 取消任务 |
| DELETE | `/api/providers/:name/tasks/:id` | 删除任务 |

### 7.2 视频生成器

| 方法 | URL | 说明 |
|------|-----|------|
| GET | `/api/video-generator/tasks` | 查看所有任务 |
| POST | `/api/video-generator/generate` | 单个生成（multipart） |
| POST | `/api/video-generator/run` | 全自动流水线 |
| GET | `/api/video-generator/jobs` | 活跃流水线 |
| GET | `/api/video-generator/jobs/:id` | 流水线状态 |

### 7.3 视频任务

| 方法 | URL | 说明 |
|------|-----|------|
| GET | `/api/video-tasks` | 所有视频任务 |
| POST | `/api/video-tasks/:id/retry` | 重试 |

---

## 8. 故障排除

### Q: 启动后仍是 Mock 模式

**检查清单：**

```powershell
# 1. 确认配置了正确的文件
cat apps/server/.env | grep SEEDANCE_API_KEY
# 必须输出: SEEDANCE_API_KEY=ark-xxx（不能为空，不能有引号包裹值）

# 2. 确认已重启
# Ctrl+C → npm run dev

# 3. 确认启动日志
# → [SeedanceProvider] Mode: real

# 4. 如果上面显示 mock，检查是否有其他 .env 覆盖
dir .env*  # 查看所有 env 文件
```

### Q: 真实 API 调用返回 401/403

- 确认 API Key 格式正确：`ark-` 开头
- 检查火山引擎控制台 → API Key 是否启用
- 检查模型 `doubao-seedance-2-0-260128` 是否已开通

### Q: 任务一直 "processing" 不完成

```powershell
# 查看 Provider 轮询状态
curl http://localhost:4000/api/providers/stats
# activePollers 应该 > 0

# 超时时间：10 分钟（600,000ms）
# 超时后自动标记为 failed
```

### Q: 下载失败

- 检查 `output/videos/seedance/` 目录是否存在
- 检查磁盘空间
- 火山引擎返回的 `video_url` 有效期有限，任务完成后尽快下载

### Q: 如何添加新的 AI Provider

参考 `IVideoProvider` 接口实现，注册到 `ProviderManager`：

```typescript
// 1. 创建 MyProvider.ts 实现 IVideoProvider
// 2. 在 ProviderManager 中注册
ProviderManager.instance.register(new MyProvider({ apiKey: process.env.MY_API_KEY }))
// 3. 在 providers/index.ts 中导出
// 4. 在 .env 中添加环境变量
```

---

## 快速参考卡片

```
┌─────────────────────────────────────────────────────────────┐
│  Seedance 快速配置                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  配置文件:  apps/server/.env                                  │
│                                                             │
│  Mock 模式:  SEEDANCE_API_KEY=         (留空)                │
│  真实模式:  SEEDANCE_API_KEY=ark-xxx   (填 Key)              │
│                                                             │
│  API 地址:  https://ark.cn-beijing.volces.com/api/v3/       │
│             contents/generations/tasks                       │
│                                                             │
│  模    型:  doubao-seedance-2-0-260128                      │
│  分 辨 率:  720p                                             │
│  比    例:  9:16                                             │
│  时    长:  5 秒                                             │
│  轮询间隔:  5 秒                                             │
│  超时时间:  10 分钟                                          │
│                                                             │
│  验证命令:  curl http://localhost:4000/api/providers         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
