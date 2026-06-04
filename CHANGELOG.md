# Changelog

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
