# TikTok AI Factory — 完整迁移指南

## 从 GitHub + FULL-BACKUP 恢复到全新 Windows 电脑

**版本:** 2.1  
**日期:** 2026-06-06  
**GitHub:** https://github.com/massielvasquez193-dot/tiktok-ai-factory.git  

---

## 目录

1. [前置环境安装](#1-前置环境安装)
2. [Git Clone 源码](#2-git-clone-源码)
3. [恢复 FULL-BACKUP](#3-恢复-full-backup)
4. [数据库恢复](#4-数据库恢复)
5. [uploads 恢复](#5-uploads-恢复)
6. [videos 恢复](#6-videos-恢复)
7. [安装依赖](#7-安装依赖)
8. [方式 A：Docker 生产模式启动](#8-方式-adocker-生产模式启动)
9. [方式 B：本地开发模式启动](#9-方式-b本地开发模式启动)
10. [验证步骤](#10-验证步骤)
11. [一键恢复脚本](#11-一键恢复脚本)
12. [故障排除](#12-故障排除)

---

## 迁移前准备

在两台电脑之间迁移，你需要：

| 物品 | 来源 | 大小 |
|------|------|------|
| `TikTok-AI-Factory-Migration.zip` | 旧电脑导出 | ~7.6 MB |
| 或 `FULL-BACKUP/` 目录 | 旧电脑备份 | ~8.2 MB |
| 可选：`docker-export/` 目录 | 旧电脑导出（离线部署） | ~2 GB |

---

## 1. 前置环境安装

### 1.1 安装 Git

```powershell
# 下载安装
winget install --id Git.Git -e --source winget
# 或访问: https://git-scm.com/download/win
```

验证：
```powershell
git --version
# → git version 2.54.0
```

### 1.2 安装 Node.js 22+

```powershell
# 下载安装
winget install OpenJS.NodeJS.LTS
# 或访问: https://nodejs.org/en/download
```

验证：
```powershell
node --version   # → v22.x.x  (必须 ≥22.0.0)
npm --version    # → 10.x.x
```

### 1.3 安装 Docker Desktop（推荐，用于生产模式）

```powershell
# 下载安装
winget install Docker.DockerDesktop
# 或访问: https://www.docker.com/products/docker-desktop
```

> **重要：** 安装后必须**重启电脑**。Docker Desktop 需要 WSL2 或 Hyper-V。

验证：
```powershell
docker --version           # → Docker version 28.x.x
docker compose version     # → Docker Compose version v2.x.x
docker run hello-world     # → Hello from Docker!
```

### 1.4 安装 Python（可选，AI 媒体处理需要）

```powershell
winget install Python.Python.3.12
```

验证：
```powershell
python --version
```

---

## 2. Git Clone 源码

打开 **PowerShell**（以管理员身份运行），执行：

```powershell
cd C:\Projects
git clone https://github.com/massielvasquez193-dot/tiktok-ai-factory.git
cd tiktok-ai-factory
```

> 如果 GitHub 不可访问，使用离线方式：将旧电脑上的项目目录完整复制到新电脑。

---

## 3. 恢复 FULL-BACKUP

将 `FULL-BACKUP` 目录复制到项目根目录下。

### 3.1 从 Migration ZIP 恢复

```powershell
# 将 TikTok-AI-Factory-Migration.zip 放到项目目录
# 解压
Expand-Archive -Path "TikTok-AI-Factory-Migration.zip" -DestinationPath ".\" -Force
```

### 3.2 从 FULL-BACKUP 目录恢复

如果从旧电脑直接复制了 `FULL-BACKUP/` 目录：

```powershell
# 确认目录存在
dir .\FULL-BACKUP\
# 应包含: .env, .env.production, dev.db, uploads.zip, videos.zip
```

---

## 4. 数据库恢复

```powershell
# 确认目标目录存在
New-Item -ItemType Directory -Force -Path ".\apps\server\prisma"

# 恢复 SQLite 数据库
Copy-Item ".\FULL-BACKUP\dev.db" ".\apps\server\prisma\dev.db" -Force

# 验证
dir ".\apps\server\prisma\dev.db"
# → 应显示 ~585,728 bytes
```

> **数据库内容：** 6 个产品、117KB 脚本数据、视频任务、活动记录、知识库条目。

### 没有备份数据库？

如果 `FULL-BACKUP/dev.db` 不存在，Prisma 会在首次运行时自动创建空数据库：

```powershell
cd apps\server
npx prisma db push
cd ..\..
```

---

## 5. uploads 恢复

```powershell
# 清空现有 uploads（如果有）
Remove-Item ".\uploads\*" -Recurse -Force -ErrorAction SilentlyContinue

# 解压备份
Expand-Archive -Path ".\FULL-BACKUP\uploads.zip" -DestinationPath ".\uploads" -Force

# 验证
dir .\uploads\ -Recurse
```

**恢复的目录结构：**
```
uploads/
├── assets/            # 产品图片
├── asset_library/     # 素材库
│   ├── competitor_video/
│   ├── product_image/
│   ├── product_video/
│   └── ugc_talking/
└── campaigns/         # 活动图片
```

---

## 6. videos 恢复

```powershell
# 创建输出目录
New-Item -ItemType Directory -Force -Path ".\output\videos"

# 清空现有视频（如果有）
Remove-Item ".\output\videos\*" -Recurse -Force -ErrorAction SilentlyContinue

# 解压备份
Expand-Archive -Path ".\FULL-BACKUP\videos.zip" -DestinationPath ".\output\videos" -Force

# 验证
dir .\output\videos\*.mp4
# → 应显示 3 个 MP4 文件
```

---

## 7. 安装依赖

### 7.1 npm 依赖

```powershell
# 在项目根目录执行
npm install
```

> 这是一个 monorepo（npm workspaces），会安装 `packages/*` 和 `apps/*` 的所有依赖。

### 7.2 生成 Prisma Client

```powershell
cd apps\server
npx prisma generate
cd ..\..
```

验证：
```powershell
dir .\node_modules\@prisma\client\
# → 应包含 index.js, index.d.ts 等
```

### 7.3 安装 Python 依赖（可选）

```powershell
pip install -r requirements.txt
# 包含: moviepy, playwright
```

---

## 8. 方式 A：Docker 生产模式启动

### 8.1 配置环境变量

编辑 `.env.production`，填写 API 密钥：

```env
# 必填
DB_USER=tiktok
DB_PASSWORD=changeme123          # ← 修改为安全密码
DB_NAME=tiktok_video_factory

# AI 提供商（不填则使用 Mock 模式）
SEEDANCE_API_KEY=ark-xxx         # 火山引擎 Seedance
OPENAI_API_KEY=sk-xxx            # OpenAI

# 可选
TTS_ENGINE=azure
TTS_API_KEY=your-azure-key
```

### 8.2 构建并启动

```powershell
# 构建 Docker 镜像
docker compose -f docker-compose.prod.yml build --no-cache

# 启动所有服务
docker compose -f docker-compose.prod.yml up -d
```

**启动的服务：**

| 容器 | 镜像 | 端口 |
|------|------|------|
| `tiktok-db` | postgres:16-alpine | 5432 |
| `tiktok-redis` | redis:7-alpine | 6379 |
| `tiktok-app` | tiktok-factory:latest | 3000, 4000 |

### 8.3 等待启动

```powershell
# PostgreSQL 需要 ~10 秒初始化
Start-Sleep -Seconds 15

# 检查所有容器状态
docker compose -f docker-compose.prod.yml ps
```

### 8.4 运行数据库迁移

```powershell
docker compose -f docker-compose.prod.yml exec -T app npx prisma db push --skip-generate
```

---

## 9. 方式 B：本地开发模式启动

> **适用场景：** 未安装 Docker，或仅需快速开发调试。

### 9.1 配置环境变量

确保 `apps/server/.env` 使用 SQLite：

```env
DATABASE_URL="file:./dev.db"
PORT=4000
SEEDANCE_API_KEY=ark-xxx         # 不填则 Mock 模式
OPENAI_API_KEY=
```

### 9.2 启动开发服务器

```powershell
# 同时启动 API (port 4000) + Web (port 3000)
npm run dev
```

输出示例：
```
[server] [Server] http://localhost:4000
[web]    ✓ Ready in 2.4s
[web]    - Local: http://localhost:3000
```

### 9.3 PM2 生产进程管理（可选）

```powershell
# 安装 PM2
npm install -g pm2

# 构建项目
npm run build

# 启动集群模式
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 10. 验证步骤

### 10.1 API 健康检查

```powershell
curl http://localhost:4000/api/health
```

预期输出：
```json
{"status":"ok","version":"1.0.0","uptime":7.5}
```

### 10.2 数据库连接

```powershell
curl http://localhost:4000/api/products
```

预期输出：包含产品的 JSON 数组，如 `Medicube PDRN Pink Collagen Balm`。

### 10.3 全部端点验证

```powershell
$endpoints = @(
    "/api/health",
    "/api/products",
    "/api/scripts",
    "/api/videos",
    "/api/research",
    "/api/campaigns",
    "/api/providers",
    "/api/assets",
    "/api/campaigns-v2",
    "/api/knowledge/hooks",
    "/api/automation"
)

foreach ($ep in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:4000$ep" -TimeoutSec 5 -UseBasicParsing
        Write-Host "  [OK] $ep — HTTP $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "  [--] $ep — not available" -ForegroundColor Yellow
    }
}
```

### 10.4 Web 前端

打开浏览器访问：
- **http://localhost:3000** — TikTok AI Factory 控制台

应看到侧边栏导航（产品库、脚本中心、分镜板、提示词库、多国活动、知识库...）和主控制台页面。

### 10.5 Docker 模式额外验证

```powershell
# PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U tiktok
# → accepting connections

# Redis
docker compose -f docker-compose.prod.yml exec redis redis-cli ping
# → PONG

# 查看日志
docker compose -f docker-compose.prod.yml logs -f app
```

### 10.6 资源文件验证

```powershell
# uploads
Write-Host "Uploads:  $(@(dir .\uploads\ -Recurse -File).Count) files"

# videos
Write-Host "Videos:   $(@(dir .\output\videos\*.mp4).Count) MP4 files"

# database
$db = Get-Item ".\apps\server\prisma\dev.db"
Write-Host "Database: $([math]::Round($db.Length/1KB,1)) KB"
```

---

## 11. 一键恢复脚本

项目包含 `restore.ps1`，自动执行步骤 2-10：

```powershell
# 完整恢复（自动检测 Docker）
.\restore.ps1

# 强制使用 Docker 生产模式
.\restore.ps1 -Mode Docker

# 强制使用本地开发模式
.\restore.ps1 -Mode Local

# 仅检查前置条件
.\restore.ps1 -DryRun

# 预览执行计划（不实际执行）
.\restore.ps1 -WhatIf

# 已在项目目录中，跳过 clone
.\restore.ps1 -SkipClone

# Docker 离线模式（使用预加载的镜像）
.\restore.ps1 -Mode Docker -Offline
```

---

## 12. 故障排除

### Q: `git clone` 失败（网络问题）

**方案 A：** 使用代理
```powershell
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890
```

**方案 B：** 离线迁移
将旧电脑的整个项目文件夹复制到新电脑，跳过 clone 步骤，使用 `-SkipClone` 参数。

### Q: `npm install` 失败

```powershell
# 清除缓存
npm cache clean --force
Remove-Item -Recurse -Force .\node_modules
Remove-Item -Force .\package-lock.json
npm install
```

### Q: Prisma 报错 `DATABASE_URL must start with 'file:'`

检查 `apps/server/.env` 中的 DATABASE_URL：
```env
# 正确（本地开发）
DATABASE_URL="file:./dev.db"

# 错误（这是 Docker 模式用的）
DATABASE_URL="postgresql://tiktok:tiktok_secret@localhost:5432/tiktok_video_factory"
```

### Q: 端口被占用

```powershell
# 查找占用进程
netstat -ano | findstr ":4000"
netstat -ano | findstr ":3000"

# 终止进程（替换 PID）
taskkill /F /PID <PID>
```

### Q: Docker 容器无法启动

```powershell
# 查看详细日志
docker compose -f docker-compose.prod.yml logs

# 重新构建
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### Q: `SEEDANCE_API_KEY` 为空

AI 视频生成将运行在 **Mock 模式**（不调用真实 API）。这是正常的开发模式行为。如需真实生成，请填写火山引擎 API Key。

---

## 完整项目结构（恢复后）

```
tiktok-ai-factory/
├── .env                          # 开发环境变量
├── .env.production               # 生产环境变量
├── .env.example                  # 环境变量模板
├── package.json                  # Monorepo 根配置
├── docker-compose.yml            # Docker 开发配置（PostgreSQL + Redis）
├── docker-compose.prod.yml       # Docker 生产配置（完整栈）
├── Dockerfile                    # 生产 Docker 镜像
├── Dockerfile.full               # 全量 Docker 镜像（含 Python）
├── ecosystem.config.js           # PM2 进程管理配置
├── restore.ps1                   # 一键恢复脚本 ★
├── backup.ps1                    # 备份脚本
├── backup.sh                     # Linux 备份脚本
├── deploy.ps1                    # 部署脚本
├── deploy.sh                     # Linux 部署脚本
├── MIGRATION_GUIDE.md            # 本文件 ★
├── requirements.txt              # Python 依赖
│
├── apps/
│   ├── server/                   # Express API 服务器 (port 4000)
│   │   ├── .env                  # 服务器专属环境变量
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # 数据模型（SQLite/PostgreSQL）
│   │   │   └── dev.db            # SQLite 数据库 ★ 584 KB
│   │   └── src/
│   │       ├── index.ts          # 入口
│   │       ├── routes/           # 26 个 API 路由模块
│   │       └── services/         # Worker、TikTok 同步等
│   │
│   └── web/                      # Next.js 前端 (port 3000)
│       ├── src/
│       │   └── app/              # App Router 页面
│       └── .next/                # 构建输出
│
├── packages/
│   └── shared/                   # 共享类型和工具
│
├── uploads/                      # 用户上传文件 ★ 5 items
│   ├── assets/
│   ├── asset_library/
│   └── campaigns/
│
├── output/
│   ├── videos/                   # AI 生成的视频 ★ 3 MP4
│   └── research/                 # 竞品分析视频
│
├── nginx/
│   └── nginx.conf                # 反向代理配置
│
├── FULL-BACKUP/                  # 备份源目录
│   ├── .env
│   ├── .env.production
│   ├── dev.db
│   ├── uploads.zip
│   ├── videos.zip
│   └── restore.ps1
│
├── docker-backup/                # Docker 备份归档
├── docker-export/                # Docker 镜像导出
├── migration-backup/             # 迁移备份
└── backups/                      # 常规备份
```

---

## 服务架构图

```
                    ┌─────────────────┐
                    │   Nginx (:80)   │  ← 反向代理（生产模式）
                    │   Reverse Proxy │
                    └──────┬──────────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
    ┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
    │  Next.js     │ │ Express    │ │  Static    │
    │  Web :3000   │ │ API :4000  │ │  Files     │
    └──────────────┘ └─────┬──────┘ └────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼─────┐ ┌───▼────┐ ┌─────▼─────┐
       │ PostgreSQL │ │ Redis  │ │  SQLite   │
       │ :5432      │ │ :6379  │ │  dev.db   │
       │  (Docker)  │ │ (Docker)│ │  (Local)  │
       └────────────┘ └────────┘ └───────────┘
```

---

## 日常运维命令

```powershell
# ── 启动 ──
npm run dev                          # 本地开发模式
docker compose -f docker-compose.prod.yml up -d   # Docker 生产模式

# ── 停止 ──
Ctrl+C                               # 停止 npm run dev
docker compose -f docker-compose.prod.yml down    # 停止 Docker

# ── 备份 ──
.\backup.ps1                         # 备份数据库 + uploads + videos
bash backup.sh                       # Linux 备份

# ── 数据库管理 ──
npm run db:studio                    # Prisma Studio (http://localhost:5555)
npm run db:push                      # 同步 schema 到数据库
npm run db:generate                  # 重新生成 Prisma Client

# ── 日志 ──
docker compose -f docker-compose.prod.yml logs -f app   # Docker 日志
pm2 logs                             # PM2 日志

# ── 更新依赖 ──
npm update                           # 更新所有依赖
npm audit fix                        # 修复安全漏洞
```
