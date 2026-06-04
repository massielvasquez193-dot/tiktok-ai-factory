# Changelog

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
