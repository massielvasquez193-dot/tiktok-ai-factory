# Changelog

## [0.4.0] — 2026-06-04

### Added
- `server/src/services/queue.ts` — BullMQ 队列服务 (5 个队列: product-analysis, script-generation, video-generation, voice-generation, video-composition)
- `server/src/services/worker.ts` — BullMQ Worker 异步任务处理器 (4 个 Worker, 并发控制)
- `server/src/services/tiktok_api.ts` — TikTok Shop API 客户端 (OAuth, 视频发布, 商品同步, 数据分析)
- `server/src/routes/upload.ts` — 文件上传 API (multer, 支持单文件/批量, 自动缩略图)
- `server/src/routes/queue_routes.ts` — 队列管理 API (job 状态, queue 统计, pipeline 提交)
- `server/src/routes/tiktok_routes.ts` — TikTok 集成 API (OAuth, 发布, 分析)
- `server/prisma/init.sql` — 数据库初始化脚本 (索引 + 示例数据)
- `web/src/app/campaigns/[id]/page.tsx` — 活动详情页 (实时进度条 + 视频预览)
- `web/src/app/products/[id]/page.tsx` — 产品详情页 (资产上传 + 脚本列表)
- `package.json` — 根目录统一脚本 (dev/server/web/worker/docker/db/setup)

### Changed
- `server/src/index.ts` — 注册 upload/queue/tiktok 路由 + 静态文件服务
- `server/package.json` — 新增 bullmq, multer 依赖
- 项目 version → 0.3.0

## [0.3.0] — 2026-06-04

### Added
- `src/agents/viral_research_agent.py` — Playwright 爆款采集 Agent (TikTok 搜索 + 结构化分析)
- `src/services/playwright_browser.py` — 浏览器服务 (会话持久化, 反检测)
- `server/` — Express + TypeScript API 后端
  - Prisma Schema: 8 个数据模型 (Product, Script, Campaign, Video, Task, ViralVideo, ViralTemplate)
  - REST API: 6 组路由 (products, scripts, campaigns, videos, research, pipeline)
  - Zod 输入验证 + 统一错误处理
- `web/` — Next.js 15 Dashboard 前端
  - 5 个页面: Dashboard, Products (list + new), Campaigns, Scripts, Research
  - Tailwind + Lucide 图标 + 响应式侧边栏
  - API 客户端封装
- `docker-compose.yml` — 一键部署 (PostgreSQL + Redis + Server + Web)
- `server/Dockerfile` + `web/Dockerfile` — 生产级容器构建
- `requirements.txt` — Python 依赖清单
- `server/.env.example` — 环境变量模板

### Changed
- TODO.md — Sprint 1+2 标记完成
- 项目从纯 Python CLI 进化为全栈 Web 平台

## [0.2.0] — 2026-06-04

### Added
- `src/utils/config.py` — 统一配置加载器 (支持 env var fallback)
- `src/services/seedance_client.py` — Seedance API 客户端 (3 提供商: aimlapi/fal/volcengine)
- `src/agents/product_agent.py` — 产品分析 Agent (自动提取卖点/USP/Hooks)
- `src/agents/script_agent.py` — 脚本生成 Agent (5 类型 x 5 语言)
- `src/agents/storyboard_agent.py` — 分镜 Agent (CSV + SRT + AI 提示词)
- `src/services/tts_client.py` — TTS 配音客户端 (OpenAI/ElevenLabs/Azure, 5 语言)
- `src/services/composer.py` — 视频合成 (moviepy + ffmpeg 双引擎)
- `src/pipeline.py` — 主流水线编排器 (6 阶段全流程)
- `configs/product_brief.json` — BlendJet 2 测试用产品简报

### Verified
- Dry-run 测试通过: 产品 → 分析 → 脚本(x3) → 分镜 → SRT(x3)

### Changed
- TODO.md — 标记 P0 阶段完成

## [0.1.0] — 2026-06-04

### Added
- 项目初始化: `D:\CCTK视频\`
- `CLAUDE.md` — Agent 系统规则 (10 个内置 Agent 定义)
- 目录结构: `agents/`, `docs/`, `tasks/`, `configs/`, `scripts/`, `src/`
- `ROADMAP.md` — 6 阶段路线图
- `TODO.md` — Sprint 1 任务清单
- `product_brief.template.json` — 产品简报模板
- `seedance_config.template.json` — Seedance API 配置模板
- Git 仓库初始化
