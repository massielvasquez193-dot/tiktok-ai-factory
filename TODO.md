# TODO — Sprint 2+ (即将开始)

## 当前状态: Sprint 1 & 2 完成 ✅

Sprint 1 (MVP Pipeline) + Sprint 2 (Web + Infra) 已于 2026-06-04 全部交付。

---

### 🔴 P0 — 已完成

- [x] `src/agents/product_agent.py` — 产品分析 Agent ✅
- [x] `src/agents/script_agent.py` — 5 类型 x 5 语言脚本 Agent ✅
- [x] `src/agents/storyboard_agent.py` — 分镜 + AI 提示词 + SRT ✅
- [x] `src/agents/viral_research_agent.py` — Playwright 爆款采集 Agent ✅
- [x] `src/services/seedance_client.py` — 3 提供商 Seedance 客户端 ✅
- [x] `src/services/tts_client.py` — 3 引擎 TTS 客户端 ✅
- [x] `src/services/composer.py` — moviepy + ffmpeg 合成 ✅
- [x] `src/services/playwright_browser.py` — 浏览器服务 ✅
- [x] `src/pipeline.py` — 6 阶段编排器 ✅
- [x] `server/` — Express + TypeScript API + Prisma Schema ✅
- [x] `web/` — Next.js Dashboard (5 pages) ✅
- [x] `docker-compose.yml` — PostgreSQL + Redis + App 一键部署 ✅
- [x] `requirements.txt` — Python 依赖清单 ✅
- [x] Dry-run 验证通过 ✅

---

## Sprint 3 计划

### 🔧 API 集成
- [ ] 配置真实 Seedance API key，跑通视频生成
- [ ] 配置真实 TTS API key，跑通配音
- [ ] 端到端视频合成验证

### 🚀 功能增强
- [ ] BullMQ Worker 实现异步流水线
- [ ] Web 端文件上传 (产品图片/素材)
- [ ] 视频预览播放器
- [ ] TikTok Shop API 集成

### 📦 部署
- [ ] `docker compose up` 全栈启动验证
- [ ] Nginx 反向代理配置
- [ ] CI/CD pipeline (GitHub Actions)

---

## 已完成

- [x] Sprint 1: MVP Pipeline (Product → Script → Storyboard → Video → Voice → Compose)
- [x] Sprint 2: Web Dashboard + Backend API + Docker
