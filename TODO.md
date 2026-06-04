# TODO — Sprint 1 (当前)

## 本周任务

### 🔴 P0 — 立即开始

- [x] 创建 `src/agents/product_agent.py` — 产品分析 Agent ✅
- [x] 创建 `src/agents/script_agent.py` — 脚本生成 Agent (5 类型) ✅
- [x] 创建 `src/agents/storyboard_agent.py` — 分镜 Agent ✅
- [x] 创建 `src/services/seedance_client.py` — Seedance API 客户端 ✅
- [x] 创建 `src/services/tts_client.py` — TTS 配音客户端 (3 引擎) ✅
- [x] 创建 `src/services/composer.py` — 视频合成 (moviepy + ffmpeg) ✅
- [x] 创建 `src/pipeline.py` — 主流水线调度器 ✅
- [x] 端到端 Dry Run 验证: 产品简报 → 脚本 → 分镜 → SRT ✅

### 🟡 P1 — 本周内

- [ ] Seedance API 真实调用测试 (需 API key)
- [ ] TTS 配音真实调用测试 (需 API key)
- [ ] 端到端视频合成测试 (需视频素材)
- [ ] 添加 Playwright 自动采集爆款素材脚本

### 🟢 P2 — 下周

- [ ] 创建 Web Dashboard 前端骨架 (Next.js)
- [ ] 创建后端 API (Express + TypeScript)
- [ ] 数据库 Schema 设计 (Prisma)
- [ ] Docker Compose 部署配置

---

## 已完成

- [x] 项目初始化 (2026-06-04)
- [x] CLAUDE.md Agent 系统规则
- [x] 目录结构搭建
- [x] 全部核心 Agent 实现 (Product, Script, Storyboard, Video, Voice, Composer)
- [x] Pipeline 编排器
- [x] Dry-run 验证通过 (BlendJet 2 产品)
