# PROJECT_AUDIT_REPORT

Generated: 2026-06-07 19:43:20 CST

Project: `/home/ubuntu/tiktok-ai-factory`


## 1. Git ??


### git status

```text
$ git status
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   apps/server/Dockerfile.prod
	modified:   apps/server/prisma/schema.prisma
	modified:   apps/server/src/services/realAnalyzer.ts
	modified:   apps/web/Dockerfile.prod
	modified:   apps/web/package.json
	modified:   apps/web/src/app/campaigns/new/page.tsx
	modified:   apps/web/src/i18n/messages/en-US.json
	modified:   apps/web/src/i18n/messages/zh-CN.json
	modified:   docker-compose.prod.yml
	modified:   package-lock.json

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	.dockerignore
	PROJECT_AUDIT_REPORT.md
	apps/web/public/

no changes added to commit (use "git add" and/or "git commit -a")

[exit_code=0]

```

### git remote -v

```text
$ git remote -v
origin	https://github.com/massielvasquez193-dot/tiktok-ai-factory.git (fetch)
origin	https://github.com/massielvasquez193-dot/tiktok-ai-factory.git (push)

[exit_code=0]

```

### git branch -a

```text
$ git branch -a
* main
  remotes/origin/HEAD -> origin/main
  remotes/origin/main

[exit_code=0]

```

### git log --oneline -10

```text
$ git log --oneline -10
3c6fdba Update database
81f3f74 Initial commit
4b70a54 Add project backup
d13f14a TikTok AI Factory v2.1 — Full Production System
d4200d0 feat: Sprint 3 — Async Queue + File Upload + TikTok API + Live Progress
bd1f551 feat: Sprint 2 — Web Dashboard + Backend API + Docker + Viral Research Agent
797656a feat: implement full Agent pipeline (Sprint 1 MVP)
3c02a71 feat: init TikTok AI Video Factory project

[exit_code=0]

```
- ?????`main`
- ??????`13` ?
- origin/main ?????`## main...origin/main`

## 2. Docker ??

```text
$ docker ps -a
CONTAINER ID   IMAGE                      COMMAND                  CREATED          STATUS                    PORTS                                                                          NAMES
8ea235c88f97   nginx:alpine               "/docker-entrypoint.…"   25 minutes ago   Up 25 minutes             0.0.0.0:80->80/tcp, [::]:80->80/tcp, 0.0.0.0:443->443/tcp, [::]:443->443/tcp   tiktok-vf-nginx
89a092c93656   tiktok-ai-factory-web      "docker-entrypoint.s…"   25 minutes ago   Up 25 minutes             0.0.0.0:3000->3000/tcp, [::]:3000->3000/tcp                                    tiktok-vf-web
873ea4aa8b40   tiktok-ai-factory-server   "docker-entrypoint.s…"   25 minutes ago   Up 25 minutes             0.0.0.0:4000->4000/tcp, [::]:4000->4000/tcp                                    tiktok-vf-server
99f89753a23c   postgres:16-alpine         "docker-entrypoint.s…"   25 minutes ago   Up 25 minutes (healthy)   0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp                                    tiktok-vf-db
11a61ab84057   redis:7-alpine             "docker-entrypoint.s…"   25 minutes ago   Up 25 minutes (healthy)   0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp                                    tiktok-vf-redis

[exit_code=0]

```
- `tiktok-vf-nginx`: `running`
- `tiktok-vf-web`: `running`
- `tiktok-vf-server`: `running`
- `tiktok-vf-db`: `running/healthy`
- `tiktok-vf-redis`: `running/healthy`

## 3. ?????

```text
$ docker exec tiktok-vf-db psql -U tiktok -d tiktok_video_factory -c '\dt'
               List of relations
 Schema |         Name         | Type  | Owner  
--------+----------------------+-------+--------
 public | agent_runs           | table | tiktok
 public | analytics_events     | table | tiktok
 public | asset_library        | table | tiktok
 public | assets               | table | tiktok
 public | automation_jobs      | table | tiktok
 public | automation_logs      | table | tiktok
 public | automation_tasks     | table | tiktok
 public | campaign_countries   | table | tiktok
 public | campaign_records     | table | tiktok
 public | campaign_v2          | table | tiktok
 public | knowledge_ctas       | table | tiktok
 public | knowledge_hooks      | table | tiktok
 public | knowledge_pains      | table | tiktok
 public | knowledge_prompts    | table | tiktok
 public | knowledge_solutions  | table | tiktok
 public | knowledge_structures | table | tiktok
 public | knowledge_videos     | table | tiktok
 public | learning_insights    | table | tiktok
 public | localizations        | table | tiktok
 public | post_productions     | table | tiktok
 public | product_images       | table | tiktok
 public | products             | table | tiktok
 public | prompts              | table | tiktok
 public | publish_tasks        | table | tiktok
 public | publishing_tasks     | table | tiktok
 public | research             | table | tiktok
 public | scripts              | table | tiktok
 public | storyboards          | table | tiktok
 public | tiktok_data          | table | tiktok
 public | tiktok_metrics       | table | tiktok
 public | video_performance    | table | tiktok
 public | video_tasks          | table | tiktok
 public | videos               | table | tiktok
(33 rows)


[exit_code=0]

```
- ????`33`
- ????????`?`
- ????
  - agent_runs
  - analytics_events
  - asset_library
  - assets
  - automation_jobs
  - automation_logs
  - automation_tasks
  - campaign_countries
  - campaign_records
  - campaign_v2
  - knowledge_ctas
  - knowledge_hooks
  - knowledge_pains
  - knowledge_prompts
  - knowledge_solutions
  - knowledge_structures
  - knowledge_videos
  - learning_insights
  - localizations
  - post_productions
  - product_images
  - products
  - prompts
  - publish_tasks
  - publishing_tasks
  - research
  - scripts
  - storyboards
  - tiktok_data
  - tiktok_metrics
  - video_performance
  - video_tasks
  - videos

## 4. Redis ??

```text
$ docker exec tiktok-vf-redis redis-cli ping
PONG

[exit_code=0]

```

## 5. ??????

```text
$ ls -la .env || true
-rw-rw-r-- 1 ubuntu ubuntu 104 Jun  7 19:12 .env

[exit_code=0]

```
???????

```text
DB_USER=***
DB_PASSWORD=***
DB_NAME=***
SEEDANCE_API_KEY=(empty)
OPENAI_API_KEY=(empty)

```
- `DB_USER`: present
- `DB_PASSWORD`: present
- `DB_NAME`: present
- `SEEDANCE_API_KEY`: empty/missing
- `OPENAI_API_KEY`: empty/missing

## 6. ????

- `apps/web`: exists
- `apps/web/package.json`: exists
- `apps/web/next.config.js`: exists

### npm install

```text
$ cd apps/web && npm install

changed 1 package, and audited 317 packages in 3s

55 packages are looking for funding
  run `npm fund` for details

2 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
npm warn allow-scripts 6 packages have install scripts not yet covered by allowScripts:
npm warn allow-scripts   esbuild@0.28.0 (install: (install scripts present))
npm warn allow-scripts   sharp@0.34.5 (install: (install scripts present))
npm warn allow-scripts   @prisma/client@6.19.3 (postinstall: node scripts/postinstall.js)
npm warn allow-scripts   @prisma/engines@6.19.3 (postinstall: node scripts/postinstall.js)
npm warn allow-scripts   msgpackr-extract@3.0.4 (install: node-gyp-build-optional-packages)
npm warn allow-scripts   prisma@6.19.3 (preinstall: node scripts/preinstall-entry.js)
npm warn allow-scripts
npm warn allow-scripts Run `npm approve-scripts --allow-scripts-pending` to review, or `npm approve-scripts <pkg>` to allow.

[exit_code=0]

```

### npm run build

```text
$ cd apps/web && npm run build

> @tiktok-vf/web@1.0.0 build
> next build

   ▲ Next.js 15.5.19

   Creating an optimized production build ...
 ✓ Compiled successfully in 7.5s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/28) ...
   Generating static pages (7/28) 
   Generating static pages (14/28) 
   Generating static pages (21/28) 
 ✓ Generating static pages (28/28)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                 Size  First Load JS
┌ ○ /                                    8.64 kB         112 kB
├ ○ /_not-found                            994 B         104 kB
├ ○ /agent                               3.63 kB         112 kB
├ ○ /asset-library                       3.68 kB         107 kB
├ ○ /assets                              3.61 kB         114 kB
├ ○ /automation                           8.5 kB         111 kB
├ ○ /campaigns                           3.79 kB         114 kB
├ ○ /campaigns-v2                         3.9 kB         107 kB
├ ƒ /campaigns/[id]                      2.78 kB         116 kB
├ ○ /campaigns/new                       2.29 kB         109 kB
├ ○ /data-center                         20.7 kB         235 kB
├ ○ /knowledge                           8.45 kB         111 kB
├ ○ /localization                           3 kB         106 kB
├ ○ /performance                         7.86 kB         111 kB
├ ○ /post-production                     4.27 kB         107 kB
├ ○ /products                            7.45 kB         114 kB
├ ƒ /products/[id]                       3.38 kB         110 kB
├ ○ /products/new                        3.25 kB         110 kB
├ ○ /prompts                             3.97 kB         107 kB
├ ○ /providers                           1.92 kB         108 kB
├ ○ /providers/seedance                  3.45 kB         114 kB
├ ○ /publish                             7.87 kB         111 kB
├ ○ /publishing                          2.94 kB         106 kB
├ ○ /scripts                             3.17 kB         113 kB
├ ○ /storyboards                            4 kB         107 kB
├ ○ /tiktok-connector                    1.78 kB         216 kB
├ ○ /video-generator                     8.86 kB         112 kB
└ ○ /video-queue                         3.15 kB         113 kB
+ First Load JS shared by all             103 kB
  ├ chunks/18-f2538672e261a112.js        46.7 kB
  ├ chunks/87c73c54-09e1ba5c70e60a51.js  54.2 kB
  └ other shared chunks (total)          1.94 kB


○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand


[exit_code=0]

```

## 7. ????

- `apps/server`: exists
- `apps/server/package.json`: exists
- `apps/server/prisma`: exists

### npm install

```text
$ cd apps/server && npm install

up to date, audited 317 packages in 2s

55 packages are looking for funding
  run `npm fund` for details

1 moderate severity vulnerability

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
npm warn allow-scripts 6 packages have install scripts not yet covered by allowScripts:
npm warn allow-scripts   @prisma/client@6.19.3 (install: (install scripts present))
npm warn allow-scripts   @prisma/engines@6.19.3 (install: (install scripts present))
npm warn allow-scripts   esbuild@0.28.0 (install: (install scripts present))
npm warn allow-scripts   msgpackr-extract@3.0.4 (install: node-gyp rebuild)
npm warn allow-scripts   prisma@6.19.3 (install: (install scripts present))
npm warn allow-scripts   sharp@0.34.5 (install: (install scripts present))
npm warn allow-scripts
npm warn allow-scripts Run `npm approve-scripts --allow-scripts-pending` to review, or `npm approve-scripts <pkg>` to allow.

[exit_code=0]

```

### npx prisma generate

```text
$ cd apps/server && DATABASE_URL='postgresql://tiktok:tiktok_secret@localhost:5432/tiktok_video_factory' npx prisma generate
Prisma schema loaded from prisma/schema.prisma

✔ Generated Prisma Client (v6.19.3) to ./../../node_modules/@prisma/client in 413ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Interested in query caching in just a few lines of code? Try Accelerate today! https://pris.ly/tip-3-accelerate


[exit_code=0]

```

### npm run build

```text
$ cd apps/server && npm run build

> @tiktok-vf/server@1.0.0 build
> tsc


[exit_code=0]

```

## 8. API ??

```text
$ curl -i http://localhost:4000/api/health
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0100    57  100    57    0     0  31897      0 --:--:-- --:--:-- --:--:-- 57000
HTTP/1.1 200 OK
X-Powered-By: Express
Access-Control-Allow-Origin: *
Content-Type: application/json; charset=utf-8
Content-Length: 57
ETag: W/"39-cuuHsR+5WdS3rvBUMqXoCap7iog"
Date: Sun, 07 Jun 2026 11:44:04 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"status":"ok","version":"1.0.0","uptime":1574.562378005}
[exit_code=0]

```
- API HTTP ???`200`

## 9. Web ??

```text
$ curl -I http://localhost:3000
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0  0 19991    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0
HTTP/1.1 200 OK
Vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding
x-nextjs-cache: HIT
x-nextjs-prerender: 1
x-nextjs-prerender: 1
x-nextjs-stale-time: 300
X-Powered-By: Next.js
Cache-Control: s-maxage=31536000
ETag: "134j7iljo8ifat"
Content-Type: text/html; charset=utf-8
Content-Length: 19991
Date: Sun, 07 Jun 2026 11:44:04 GMT
Connection: keep-alive
Keep-Alive: timeout=5


[exit_code=0]

```
- Web HTTP ???`200`

## 10. AI ????

```text
$ grep -RInE 'Seedance|OpenAI|DeepSeek|Gemini|Kling|Veo' apps packages --exclude-dir=node_modules --exclude-dir=.next | head -300
apps/web/src/i18n/messages/zh-CN.json:1:{"menu.dashboard":"控制台","menu.products":"产品库","menu.scripts":"脚本中心","menu.storyboards":"分镜板","menu.prompts":"提示词库","menu.campaigns":"活动管理","menu.campaignsV2":"多国活动","menu.assets":"素材","menu.assetLibrary":"素材中心","menu.knowledge":"知识库","menu.research":"趋势分析","menu.videos":"视频库","menu.videoGenerator":"视频生成","menu.videoQueue":"视频队列","menu.localization":"本地化","menu.performance":"数据中心","menu.publishing":"发布中心","menu.postProduction":"后期制作","menu.providers":"AI服务商","menu.agent":"TikTok Agent","menu.settings":"系统设置","menu.seedance":"Seedance","button.create":"创建","button.generate":"生成","button.upload":"上传","button.download":"下载","button.delete":"删除","button.save":"保存","button.cancel":"取消","button.run":"运行","button.refresh":"刷新","button.export":"导出","button.import":"导入","button.search":"搜索","button.edit":"编辑","button.copy":"复制","button.retry":"重试","button.publish":"发布","button.launch":"一键启动","button.back":"返回","button.addProduct":"添加产品","button.newCampaign":"新活动","button.sync":"同步","button.render":"渲染","button.schedule":"预约","button.publishNow":"立即发布","button.bulkGenerate":"批量生成","button.seedData":"种子数据","status.running":"运行中","status.completed":"已完成","status.failed":"失败","status.pending":"等待中","status.draft":"草稿","status.paused":"已暂停","status.published":"已发布","status.scheduled":"已预约","status.raw":"原始","status.edited":"已编辑","status.idle":"空闲","status.rendering":"渲染中","label.product":"产品","label.country":"国家","label.language":"语言","label.category":"分类","label.price":"价格","label.scripts":"脚本","label.videos":"视频","label.prompts":"提示词","label.campaigns":"活动","label.success":"成功","label.failed":"失败","label.total":"总计","label.progress":"进度","label.search":"搜索","label.filter":"筛选","label.sort":"排序","label.actions":"操作","label.brand":"品牌","label.benefits":"卖点","label.ingredients":"成分","label.hook":"Hook","label.pain":"痛点","label.solution":"解决方案","label.cta":"行动号召","label.score":"评分","label.provider":"服务商","label.duration":"时长","label.size":"大小","label.date":"日期","label.model":"模型","label.status":"状态","form.name":"名称","form.required":"必填","form.optional":"选填","form.type":"类型","form.description":"描述","modal.confirmDelete":"确认删除？","modal.confirm":"确认","toast.saved":"已保存","toast.deleted":"已删除","toast.error":"操作失败","toast.success":"操作成功","toast.created":"创建成功","toast.generated":"生成成功","title.dashboard":"控制台","title.products":"产品管理","title.scripts":"脚本生成器","title.storyboards":"分镜生成器","title.prompts":"提示词引擎","title.campaigns":"活动管理","title.knowledge":"知识库","title.research":"趋势研究","title.videos":"视频管理","title.agent":"AI TikTok Agent","title.performance":"数据分析","title.publishing":"内容发布","title.localization":"本地化引擎","title.assets":"素材库","title.postProduction":"后期处理","title.videoQueue":"视频队列","title.automation":"自动化中心","desc.dashboard":"TikTok AI 视频工厂总览","desc.products":"管理产品信息","desc.scripts":"AI 自动生成脚本","desc.knowledge":"爆款知识库","desc.agent":"一键全自动生产","desc.performance":"数据分析中心","desc.videos":"视频库管理","desc.campaigns":"多国活动管理","knowledge.topHooks":"热门开场","knowledge.topCtas":"热门CTA","knowledge.topStructures":"热门结构","knowledge.topPrompts":"热门提示词","knowledge.hooks":"开场模板","knowledge.pains":"痛点","knowledge.solutions":"解决方案","knowledge.ctas":"CTA模板","knowledge.structures":"镜头结构","knowledge.prompts":"提示词","knowledge.videos":"爆款视频","knowledge.insights":"知识洞察","research.title":"趋势研究","research.analyze":"分析视频","research.mock":"模拟","research.real":"真实分析","research.bulk":"批量分析","research.hook":"开场","research.pain":"痛点","research.solution":"方案","research.cta":"行动号召","research.sceneBreakdown":"镜头拆解","research.viralSummary":"爆款总结","research.replicable":"可复刻原因","research.aiAnalysis":"AI分析结果","dashboard.title":"控制台","dashboard.products":"产品","dashboard.campaigns":"活动","dashboard.scripts":"脚本","dashboard.videos":"视频","dashboard.overview":"总览","dashboard.recent":"最近","products.title":"产品列表","products.add":"添加产品","products.noProducts":"暂无产品","products.image":"图片","products.name":"名称","products.category":"分类","products.country":"国家","products.price":"价格","products.status":"状态","scripts.title":"脚本生成","scripts.type":"脚本类型","scripts.generate":"生成脚本","scripts.history":"历史记录","scripts.noScripts":"暂无脚本","filter.all":"全部","filter.byCountry":"按国家","filter.byStatus":"按状态","filter.byCategory":"按分类","filter.byModel":"按模型","filter.dateRange":"时间范围","filter.clear":"清除筛选","campaign.countries":"国家","campaign.videosPerCountry":"每国视频数","campaign.scriptTypes":"脚本类型","campaign.level":"级别","campaign.cost":"预估费用","campaign.run":"运行活动","campaign.progress":"进度","campaign.totalScripts":"总脚本","campaign.totalPrompts":"总提示词","campaign.totalVideos":"总视频","campaign.succeeded":"成功","campaign.failed":"失败","agent.title":"TikTok Agent","agent.launch":"一键启动","agent.newRun":"新建运行","agent.countries":"目标国家","agent.scripts":"脚本数量","agent.language":"语言","agent.step":"当前步骤","agent.progress":"进度","agent.videos":"生成视频","agent.duration":"耗时","agent.logs":"运行日志","agent.today":"今日","agent.running":"运行中","agent.total":"总计","performance.title":"数据中心","performance.total":"总计","performance.active":"活跃","performance.overview":"总览","performance.byType":"按类型","performance.byLang":"按语言","performance.byProvider":"按服务商","performance.byCountry":"按国家","publishing.title":"发布中心","publishing.generate":"生成内容","publishing.schedule":"预约发布","publishing.publish":"发布","publishing.pending":"等待中","publishing.scheduled":"已预约","publishing.published":"已发布","assets.title":"素材库","assets.upload":"上传素材","assets.types":"素材类型","assets.noAssets":"暂无素材","automation.title":"自动化中心","automation.newJob":"新建任务","automation.jobName":"任务名称","automation.agentType":"Agent类型","automation.interval":"执行间隔","automation.startTime":"开始时间","automation.endTime":"结束时间","automation.countries":"目标国家","automation.product":"产品","automation.runs":"运行次数","automation.nextRun":"下次运行","automation.active":"活跃任务","automation.totalJobs":"总任务数","automation.runsToday":"今日运行","videoQueue.title":"视频队列","videoQueue.create":"创建任务","videoQueue.bulk":"批量创建","videoQueue.retry":"重试","videoQueue.cancel":"取消","postProduction.title":"后期制作","postProduction.produce":"制作视频","postProduction.settings":"制作设置","postProduction.ctaType":"CTA类型","postProduction.priceTag":"价格标签","postProduction.discountTag":"折扣标签","postProduction.logoPos":"Logo位置","postProduction.bgm":"背景音乐","localization.title":"本地化引擎","localization.generate":"生成本地化","localization.countries":"国家选择","localization.results":"结果","providers.title":"AI服务商","providers.seedance":"Seedance","providers.kling":"Kling","providers.veo":"Veo","providers.create":"创建任务","providers.stats":"统计","menu.dataCenter":"数据中心","menu.publish":"发布管理","menu.automation":"自动化"}
apps/web/src/i18n/messages/en-US.json:1:{"menu.dashboard":"Dashboard","menu.products":"Products","menu.scripts":"Scripts","menu.storyboards":"Storyboards","menu.prompts":"Prompts","menu.campaigns":"Campaigns","menu.campaignsV2":"Campaigns V2","menu.assets":"Assets","menu.assetLibrary":"Asset Library","menu.knowledge":"Knowledge Base","menu.research":"Research","menu.videos":"Video Library","menu.videoGenerator":"Video Generator","menu.videoQueue":"Video Queue","menu.localization":"Localization","menu.performance":"Performance","menu.publishing":"Publishing","menu.postProduction":"Post Production","menu.providers":"Providers","menu.agent":"TikTok Agent","menu.settings":"Settings","menu.seedance":"Seedance","button.create":"Create","button.generate":"Generate","button.upload":"Upload","button.download":"Download","button.delete":"Delete","button.save":"Save","button.cancel":"Cancel","button.run":"Run","button.refresh":"Refresh","button.export":"Export","button.import":"Import","button.search":"Search","button.edit":"Edit","button.copy":"Copy","button.retry":"Retry","button.publish":"Publish","button.launch":"Launch","button.back":"Back","button.addProduct":"Add Product","button.newCampaign":"New Campaign","button.sync":"Sync","button.render":"Render","button.schedule":"Schedule","button.publishNow":"Publish Now","button.bulkGenerate":"Bulk Generate","button.seedData":"Seed Data","status.running":"Running","status.completed":"Completed","status.failed":"Failed","status.pending":"Pending","status.draft":"Draft","status.paused":"Paused","status.published":"Published","status.scheduled":"Scheduled","status.raw":"Raw","status.edited":"Edited","status.idle":"Idle","status.rendering":"Rendering","label.product":"Product","label.country":"Country","label.language":"Language","label.category":"Category","label.price":"Price","label.scripts":"Scripts","label.videos":"Videos","label.prompts":"Prompts","label.campaigns":"Campaigns","label.success":"Success","label.failed":"Failed","label.total":"Total","label.progress":"Progress","label.search":"Search","label.filter":"Filter","label.sort":"Sort","label.actions":"Actions","label.brand":"Brand","label.benefits":"Benefits","label.ingredients":"Ingredients","label.hook":"Hook","label.pain":"Pain Point","label.solution":"Solution","label.cta":"CTA","label.score":"Score","label.provider":"Provider","label.duration":"Duration","label.size":"Size","label.date":"Date","label.model":"Model","label.status":"Status","form.name":"Name","form.required":"Required","form.optional":"Optional","form.type":"Type","form.description":"Description","modal.confirmDelete":"Confirm delete?","modal.confirm":"Confirm","toast.saved":"Saved","toast.deleted":"Deleted","toast.error":"Operation failed","toast.success":"Success","toast.created":"Created","toast.generated":"Generated","title.dashboard":"Dashboard","title.products":"Product Manager","title.scripts":"Script Generator","title.storyboards":"Storyboard Generator","title.prompts":"Prompt Engine","title.campaigns":"Campaign Manager","title.knowledge":"Knowledge Base","title.research":"Trend Research","title.videos":"Video Manager","title.agent":"AI TikTok Agent","title.performance":"Performance Analytics","title.publishing":"Content Publishing","title.localization":"Localization Engine","title.assets":"Asset Library","title.postProduction":"Post Production","title.videoQueue":"Video Queue","title.automation":"Automation Center","desc.dashboard":"TikTok AI Video Factory Overview","desc.products":"Manage product information","desc.scripts":"AI auto-generate scripts","desc.knowledge":"Viral knowledge base","desc.agent":"One-click full auto production","desc.performance":"Data analytics center","desc.videos":"Video library","desc.campaigns":"Multi-country campaigns","knowledge.topHooks":"Top Hooks","knowledge.topCtas":"Top CTAs","knowledge.topStructures":"Top Structures","knowledge.topPrompts":"Top Prompts","knowledge.hooks":"Hooks","knowledge.pains":"Pain Points","knowledge.solutions":"Solutions","knowledge.ctas":"CTAs","knowledge.structures":"Structures","knowledge.prompts":"Prompts","knowledge.videos":"Videos","knowledge.insights":"Knowledge Insights","research.title":"Trend Research","research.analyze":"Analyze Video","research.mock":"Mock","research.real":"Real Analyze","research.bulk":"Bulk Analyze","research.hook":"Hook","research.pain":"Pain Point","research.solution":"Solution","research.cta":"CTA","research.sceneBreakdown":"Scene Breakdown","research.viralSummary":"Viral Summary","research.replicable":"Replicable Technique","research.aiAnalysis":"AI Analysis","dashboard.title":"Dashboard","dashboard.products":"Products","dashboard.campaigns":"Campaigns","dashboard.scripts":"Scripts","dashboard.videos":"Videos","dashboard.overview":"Overview","dashboard.recent":"Recent","products.title":"Products","products.add":"Add Product","products.noProducts":"No products yet","products.image":"Image","products.name":"Name","products.category":"Category","products.country":"Country","products.price":"Price","products.status":"Status","scripts.title":"Script Generator","scripts.type":"Script Type","scripts.generate":"Generate Script","scripts.history":"History","scripts.noScripts":"No scripts yet","filter.all":"All","filter.byCountry":"By Country","filter.byStatus":"By Status","filter.byCategory":"By Category","filter.byModel":"By Model","filter.dateRange":"Date Range","filter.clear":"Clear Filters","campaign.countries":"Countries","campaign.videosPerCountry":"Videos/Country","campaign.scriptTypes":"Script Types","campaign.level":"Level","campaign.cost":"Est. Cost","campaign.run":"Run Campaign","campaign.progress":"Progress","campaign.totalScripts":"Total Scripts","campaign.totalPrompts":"Total Prompts","campaign.totalVideos":"Total Videos","campaign.succeeded":"Succeeded","campaign.failed":"Failed","agent.title":"TikTok Agent","agent.launch":"Launch Agent","agent.newRun":"New Run","agent.countries":"Target Countries","agent.scripts":"Script Count","agent.language":"Language","agent.step":"Current Step","agent.progress":"Progress","agent.videos":"Videos Generated","agent.duration":"Duration","agent.logs":"Logs","agent.today":"Today","agent.running":"Running","agent.total":"Total","performance.title":"Performance Center","performance.total":"Total","performance.active":"Active","performance.overview":"Overview","performance.byType":"By Type","performance.byLang":"By Language","performance.byProvider":"By Provider","performance.byCountry":"By Country","publishing.title":"Publish Center","publishing.generate":"Generate Content","publishing.schedule":"Schedule","publishing.publish":"Publish","publishing.pending":"Pending","publishing.scheduled":"Scheduled","publishing.published":"Published","assets.title":"Asset Library","assets.upload":"Upload Asset","assets.types":"Asset Types","assets.noAssets":"No assets yet","automation.title":"Automation Center","automation.newJob":"New Job","automation.jobName":"Job Name","automation.agentType":"Agent Type","automation.interval":"Interval","automation.startTime":"Start Time","automation.endTime":"End Time","automation.countries":"Countries","automation.product":"Product","automation.runs":"Runs","automation.nextRun":"Next Run","automation.active":"Active","automation.totalJobs":"Total Jobs","automation.runsToday":"Runs Today","videoQueue.title":"Video Queue","videoQueue.create":"Create Task","videoQueue.bulk":"Bulk Create","videoQueue.retry":"Retry","videoQueue.cancel":"Cancel","postProduction.title":"Post Production","postProduction.produce":"Produce Video","postProduction.settings":"Settings","postProduction.ctaType":"CTA Type","postProduction.priceTag":"Price Tag","postProduction.discountTag":"Discount","postProduction.logoPos":"Logo Position","postProduction.bgm":"Background Music","localization.title":"Localization Engine","localization.generate":"Generate","localization.countries":"Countries","localization.results":"Results","providers.title":"AI Providers","providers.seedance":"Seedance","providers.kling":"Kling","providers.veo":"Veo","providers.create":"Create Task","providers.stats":"Statistics","menu.dataCenter":"Data Center","menu.publish":"Publish","menu.automation":"Automation"}
apps/web/src/app/campaigns/page.tsx:93:          <h3 className="font-semibold mb-4 flex items-center gap-2"><Rocket size={18} /> One Click Campaign: Upload → Research → Scripts → Storyboard → Prompt → Seedance → Video</h3>
apps/web/src/app/campaigns/page.tsx:186:                <span>{c.progress < 10 ? '1/7 Researching...' : c.progress < 20 ? '2/7 Analyzing product...' : c.progress < 40 ? '3/7 Generating scripts...' : c.progress < 55 ? '4/7 Storyboarding...' : c.progress < 65 ? '5/7 Building prompts...' : c.progress < 90 ? '6/7 Calling Seedance API...' : '7/7 Finalizing...'}</span>
apps/web/src/app/video-generator/page.tsx:125:      <div><label className="text-xs mb-1 block">Model</label><select className="input text-xs py-1.5" value={model} onChange={e=>setModel(e.target.value)}><option value="seedance">Seedance 2.0</option><option value="kling">Kling</option><option value="veo">Veo 2</option></select></div>
apps/web/src/app/agent/page.tsx:13:  { key:'video',icon:Film,label:'Call Seedance API'},
apps/web/src/app/prompts/page.tsx:36:    if (!confirm('Generate 3 prompts (Seedance + Kling + Veo) for every shot?')) return;
apps/web/src/app/prompts/page.tsx:68:          <p className="text-gray-500 text-sm">Per-scene prompts optimized for Seedance, Kling, and Veo</p>
apps/web/src/app/prompts/page.tsx:178:    seedance: 'Seedance 2.0', kling: 'Kling AI', veo: 'Veo 2',
apps/web/src/app/providers/seedance/page.tsx:7:export default function SeedanceProviderPage() {
apps/web/src/app/providers/seedance/page.tsx:88:            <Zap size={24} className="text-purple-500" /> Seedance Provider
apps/web/src/app/providers/seedance/page.tsx:90:          <p className="text-gray-500 text-sm">Mock adapter for ByteDance Seedance 2.0 AI video generation</p>
apps/web/src/app/providers/seedance/page.tsx:104:        <h3 className="font-semibold mb-4 flex items-center gap-2"><Play size={18} /> Create Seedance Tasks</h3>
apps/web/src/app/providers/seedance/page.tsx:106:          <p className="text-sm text-gray-400">Generate Seedance prompts first (use /prompts with seedance model)</p>
apps/web/src/app/providers/seedance/page.tsx:150:            <p>No Seedance tasks yet</p>
apps/web/src/app/providers/seedance/page.tsx:160:                      <span className="text-xs font-bold text-purple-500 uppercase bg-purple-50 px-1.5 py-0.5 rounded">Seedance</span>
apps/web/src/app/providers/page.tsx:9:  seedance: { color: 'border-purple-200 bg-purple-50', label: 'Seedance 2.0', desc: 'ByteDance Volcengine Ark — TikTok-optimized', href: '/providers/seedance' },
apps/web/src/app/providers/page.tsx:10:  kling: { color: 'border-blue-200 bg-blue-50', label: 'Kling AI', desc: 'Kuaishou — cinematic commercial grade', href: '/providers/kling' },
apps/web/src/app/providers/page.tsx:11:  veo: { color: 'border-green-200 bg-green-50', label: 'Veo 2', desc: 'Google DeepMind — photorealistic 8K', href: '/providers/veo' },
apps/server/src/routes/agent.ts:103:    await addLog('Step 7-8/11: Seedance video generation...', 'video', 70);
apps/server/src/routes/prompts.ts:51:    quality: '8K photorealistic, Google Veo 2 quality, true-to-life materials, HDR10, 60fps',
apps/server/src/routes/prompts.ts:72:function buildSeedancePrompt(storyboard: any): { prompt: string; negativePrompt: string } {
apps/server/src/routes/prompts.ts:100:function buildKlingPrompt(storyboard: any): { prompt: string; negativePrompt: string } {
apps/server/src/routes/prompts.ts:124:function buildVeoPrompt(storyboard: any): { prompt: string; negativePrompt: string } {
apps/server/src/routes/prompts.ts:150:    case 'seedance': return buildSeedancePrompt(storyboard);
apps/server/src/routes/prompts.ts:151:    case 'kling':    return buildKlingPrompt(storyboard);
apps/server/src/routes/prompts.ts:152:    case 'veo':      return buildVeoPrompt(storyboard);
apps/server/src/routes/prompts.ts:153:    default:         return buildSeedancePrompt(storyboard);
apps/server/src/routes/automationTasks.ts:155:    // Step 3: Prompts + Seedance
apps/server/src/routes/automationTasks.ts:156:    await prisma.automationLog.create({ data: { id: uuid(), taskId, step: 'video', status: 'running', message: 'Calling Seedance...' } });
apps/server/src/routes/campaignsV2.ts:172:    // Step 5: Seedance Video Generation
apps/server/src/routes/campaignsV2.ts:174:      await addStep(cid, 'Seedance', 'running', 85);
apps/server/src/routes/campaignsV2.ts:188:      await addStep(cid, 'Seedance', 'completed', 95);
apps/server/src/routes/campaignsV2.ts:190:      await addStep(cid, 'Seedance', 'skipped (no API key)', 95);
apps/server/src/routes/campaigns.ts:129:    // Step 6: Call Seedance API
apps/server/src/services/realAnalyzer.ts:9: *   5. OpenAI   → analyze hook/pain/solution/CTA
apps/server/src/services/realAnalyzer.ts:14: *   - OpenAI API key (OPENAI_API_KEY env var)
apps/server/src/services/realAnalyzer.ts:113:        if (r.ok) { const t = await r.text(); console.log('[RealAnalyzer] OpenAI Whisper: ' + t.slice(0, 80) + '...'); return t; }
apps/server/src/services/realAnalyzer.ts:114:      } catch { /* OpenAI failed */ }
apps/server/src/services/gptAnalyzer.ts:42:    return await callOpenAI(prompt);
apps/server/src/services/gptAnalyzer.ts:86:async function callOpenAI(prompt: string): Promise<GPTAnalysis> {
apps/server/src/services/gptAnalyzer.ts:100:  if (!r.ok) throw new Error('OpenAI: ' + r.status);
apps/server/src/providers/veo/VeoProvider.ts:7:export class VeoProvider implements IVideoProvider {
apps/server/src/providers/veo/VeoProvider.ts:25:    // Real: POST to Google Veo API
apps/server/src/providers/veo/VeoProvider.ts:48:      return { externalTaskId, status: 'failed', progress, videoUrl: '', thumbnailUrl: '', duration: 0, error: 'Veo: safety filter triggered', metadata: {} };
apps/server/src/providers/seedance/SeedanceProvider.ts:9:export class SeedanceProvider implements IVideoProvider {
apps/server/src/providers/seedance/SeedanceProvider.ts:30:    console.log(`[SeedanceProvider] Mode: ${this._mode}${apiKey ? '' : ' (set SEEDANCE_API_KEY in .env to enable real API)'}`);
apps/server/src/providers/seedance/SeedanceProvider.ts:66:    if (!taskId) throw new Error(`Seedance API: no id in response — ${JSON.stringify(resp).slice(0, 300)}`);
apps/server/src/providers/seedance/SeedanceProvider.ts:67:    console.log(`[Seedance] Real task created: ${taskId}`);
apps/server/src/providers/seedance/SeedanceProvider.ts:116:    console.log(`[Seedance] Downloaded: ${(buffer.length / 1048576).toFixed(1)}MB -> ${outputPath}`);
apps/server/src/providers/seedance/SeedanceProvider.ts:145:      return { externalTaskId: taskId, status: 'failed', progress, videoUrl: '', thumbnailUrl: '', duration: 0, error: 'Seedance: content moderation flagged', metadata: {} };
apps/server/src/providers/seedance/SeedanceProvider.ts:173:      throw new Error(`Seedance API ${method} ${url} -> ${resp.status}: ${text.slice(0, 300)}`);
apps/server/src/providers/index.ts:3:export { SeedanceProvider } from './seedance/SeedanceProvider';
apps/server/src/providers/index.ts:4:export { KlingProvider } from './kling/KlingProvider';
apps/server/src/providers/index.ts:5:export { VeoProvider } from './veo/VeoProvider';
apps/server/src/providers/manager/ProviderManager.ts:2:import { SeedanceProvider } from '../seedance/SeedanceProvider';
apps/server/src/providers/manager/ProviderManager.ts:3:import { KlingProvider } from '../kling/KlingProvider';
apps/server/src/providers/manager/ProviderManager.ts:4:import { VeoProvider } from '../veo/VeoProvider';
apps/server/src/providers/manager/ProviderManager.ts:17:      this._instance.register(new SeedanceProvider({
apps/server/src/providers/manager/ProviderManager.ts:21:      this._instance.register(new KlingProvider({
apps/server/src/providers/manager/ProviderManager.ts:25:      this._instance.register(new VeoProvider({
apps/server/src/providers/kling/KlingProvider.ts:7:export class KlingProvider implements IVideoProvider {
apps/server/src/providers/kling/KlingProvider.ts:25:    // Real: POST to Kling API
apps/server/src/providers/kling/KlingProvider.ts:48:      return { externalTaskId, status: 'failed', progress, videoUrl: '', thumbnailUrl: '', duration: 0, error: 'Kling: API timeout', metadata: {} };
apps/server/dist/routes/agent.js:108:        await addLog('Step 7-8/11: Seedance video generation...', 'video', 70);
apps/server/dist/routes/campaigns.js:142:        // Step 6: Call Seedance API
apps/server/dist/routes/automationTasks.js:220:        // Step 3: Prompts + Seedance
apps/server/dist/routes/automationTasks.js:221:        await index_1.prisma.automationLog.create({ data: { id: (0, uuid_1.v4)(), taskId, step: 'video', status: 'running', message: 'Calling Seedance...' } });
apps/server/dist/routes/campaignsV2.js:191:        // Step 5: Seedance Video Generation
apps/server/dist/routes/campaignsV2.js:193:            await addStep(cid, 'Seedance', 'running', 85);
apps/server/dist/routes/campaignsV2.js:216:            await addStep(cid, 'Seedance', 'completed', 95);
apps/server/dist/routes/campaignsV2.js:219:            await addStep(cid, 'Seedance', 'skipped (no API key)', 95);
apps/server/dist/routes/prompts.js:39:        quality: '8K photorealistic, Google Veo 2 quality, true-to-life materials, HDR10, 60fps',
apps/server/dist/routes/prompts.js:57:function buildSeedancePrompt(storyboard) {
apps/server/dist/routes/prompts.js:81:function buildKlingPrompt(storyboard) {
apps/server/dist/routes/prompts.js:101:function buildVeoPrompt(storyboard) {
apps/server/dist/routes/prompts.js:123:        case 'seedance': return buildSeedancePrompt(storyboard);
apps/server/dist/routes/prompts.js:124:        case 'kling': return buildKlingPrompt(storyboard);
apps/server/dist/routes/prompts.js:125:        case 'veo': return buildVeoPrompt(storyboard);
apps/server/dist/routes/prompts.js:126:        default: return buildSeedancePrompt(storyboard);
apps/server/dist/services/realAnalyzer.d.ts:9: *   5. OpenAI   → analyze hook/pain/solution/CTA
apps/server/dist/services/realAnalyzer.d.ts:14: *   - OpenAI API key (OPENAI_API_KEY env var)
apps/server/dist/services/gptAnalyzer.js:28:        return await callOpenAI(prompt);
apps/server/dist/services/gptAnalyzer.js:71:async function callOpenAI(prompt) {
apps/server/dist/services/gptAnalyzer.js:86:        throw new Error('OpenAI: ' + r.status);
apps/server/dist/services/realAnalyzer.js:10: *   5. OpenAI   → analyze hook/pain/solution/CTA
apps/server/dist/services/realAnalyzer.js:15: *   - OpenAI API key (OPENAI_API_KEY env var)
apps/server/dist/services/realAnalyzer.js:149:                    console.log('[RealAnalyzer] OpenAI Whisper: ' + t.slice(0, 80) + '...');
apps/server/dist/services/realAnalyzer.js:153:            catch { /* OpenAI failed */ }
apps/server/dist/providers/veo/VeoProvider.d.ts:2:export declare class VeoProvider implements IVideoProvider {
apps/server/dist/providers/veo/VeoProvider.d.ts:12://# sourceMappingURL=VeoProvider.d.ts.map
apps/server/dist/providers/veo/VeoProvider.js:3:exports.VeoProvider = void 0;
apps/server/dist/providers/veo/VeoProvider.js:5:class VeoProvider {
apps/server/dist/providers/veo/VeoProvider.js:20:        // Real: POST to Google Veo API
apps/server/dist/providers/veo/VeoProvider.js:41:            return { externalTaskId, status: 'failed', progress, videoUrl: '', thumbnailUrl: '', duration: 0, error: 'Veo: safety filter triggered', metadata: {} };
apps/server/dist/providers/veo/VeoProvider.js:52:exports.VeoProvider = VeoProvider;
apps/server/dist/providers/veo/VeoProvider.js:53://# sourceMappingURL=VeoProvider.js.map
apps/server/dist/providers/veo/VeoProvider.d.ts.map:1:{"version":3,"file":"VeoProvider.d.ts","sourceRoot":"","sources":["../../../src/providers/veo/VeoProvider.ts"],"names":[],"mappings":"AACA,OAAO,EACL,cAAc,EAAE,YAAY,EAAE,cAAc,EAC5C,eAAe,EAAE,gBAAgB,EAAE,UAAU,EAAE,cAAc,EAC9D,MAAM,8BAA8B,CAAC;AAEtC,qBAAa,WAAY,YAAW,cAAc;IAChD,QAAQ,CAAC,IAAI,EAAE,YAAY,CAAS;IACpC,QAAQ,CAAC,MAAM,EAAE,QAAQ,CAAC,cAAc,CAAC,CAAC;IAE1C,OAAO,CAAC,OAAO,CAA0D;gBAE7D,SAAS,CAAC,EAAE,OAAO,CAAC,cAAc,CAAC;IAWzC,UAAU,CAAC,KAAK,EAAE,eAAe,GAAG,OAAO,CAAC,gBAAgB,CAAC;IAQ7D,SAAS,CAAC,cAAc,EAAE,MAAM,GAAG,OAAO,CAAC,UAAU,CAAC;IAqBtD,cAAc,CAAC,QAAQ,EAAE,MAAM,EAAE,UAAU,EAAE,MAAM,GAAG,OAAO,CAAC,cAAc,CAAC;IAMnF,OAAO,CAAC,MAAM;CACf"}
apps/server/dist/providers/veo/VeoProvider.js.map:1:{"version":3,"file":"VeoProvider.js","sourceRoot":"","sources":["../../../src/providers/veo/VeoProvider.ts"],"names":[],"mappings":"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"}
apps/server/dist/providers/seedance/SeedanceProvider.d.ts.map:1:{"version":3,"file":"SeedanceProvider.d.ts","sourceRoot":"","sources":["../../../src/providers/seedance/SeedanceProvider.ts"],"names":[],"mappings":"AAGA,OAAO,EACL,cAAc,EAAE,YAAY,EAAE,cAAc,EAC5C,eAAe,EAAE,gBAAgB,EAAE,UAAU,EAAE,cAAc,EAC9D,MAAM,8BAA8B,CAAC;AAEtC,qBAAa,gBAAiB,YAAW,cAAc;IACrD,QAAQ,CAAC,IAAI,EAAE,YAAY,CAAc;IACzC,QAAQ,CAAC,MAAM,EAAE,QAAQ,CAAC,cAAc,CAAC,CAAC;IAE1C,OAAO,CAAC,KAAK,CAAkB;IAC/B,OAAO,CAAC,OAAO,CAA0D;gBAE7D,SAAS,CAAC,EAAE,OAAO,CAAC,cAAc,CAAC;IAiBzC,UAAU,CAAC,KAAK,EAAE,eAAe,GAAG,OAAO,CAAC,gBAAgB,CAAC;IAK7D,SAAS,CAAC,cAAc,EAAE,MAAM,GAAG,OAAO,CAAC,UAAU,CAAC;IAKtD,cAAc,CAAC,QAAQ,EAAE,MAAM,EAAE,UAAU,EAAE,MAAM,GAAG,OAAO,CAAC,cAAc,CAAC;YAOrE,WAAW;YAqBX,WAAW;YAqCX,aAAa;YAcb,WAAW;YAOX,WAAW;YAqBX,aAAa;YAWb,MAAM;IAiBpB,OAAO,CAAC,MAAM;CACf"}
apps/server/dist/providers/seedance/SeedanceProvider.js:36:exports.SeedanceProvider = void 0;
apps/server/dist/providers/seedance/SeedanceProvider.js:40:class SeedanceProvider {
apps/server/dist/providers/seedance/SeedanceProvider.js:57:        console.log(`[SeedanceProvider] Mode: ${this._mode}${apiKey ? '' : ' (set SEEDANCE_API_KEY in .env to enable real API)'}`);
apps/server/dist/providers/seedance/SeedanceProvider.js:91:            throw new Error(`Seedance API: no id in response — ${JSON.stringify(resp).slice(0, 300)}`);
apps/server/dist/providers/seedance/SeedanceProvider.js:92:        console.log(`[Seedance] Real task created: ${taskId}`);
apps/server/dist/providers/seedance/SeedanceProvider.js:139:        console.log(`[Seedance] Downloaded: ${(buffer.length / 1048576).toFixed(1)}MB -> ${outputPath}`);
apps/server/dist/providers/seedance/SeedanceProvider.js:164:            return { externalTaskId: taskId, status: 'failed', progress, videoUrl: '', thumbnailUrl: '', duration: 0, error: 'Seedance: content moderation flagged', metadata: {} };
apps/server/dist/providers/seedance/SeedanceProvider.js:190:            throw new Error(`Seedance API ${method} ${url} -> ${resp.status}: ${text.slice(0, 300)}`);
apps/server/dist/providers/seedance/SeedanceProvider.js:196:exports.SeedanceProvider = SeedanceProvider;
apps/server/dist/providers/seedance/SeedanceProvider.js:197://# sourceMappingURL=SeedanceProvider.js.map
apps/server/dist/providers/seedance/SeedanceProvider.d.ts:2:export declare class SeedanceProvider implements IVideoProvider {
apps/server/dist/providers/seedance/SeedanceProvider.d.ts:20://# sourceMappingURL=SeedanceProvider.d.ts.map
apps/server/dist/providers/seedance/SeedanceProvider.js.map:1:{"version":3,"file":"SeedanceProvider.js","sourceRoot":"","sources":["../../../src/providers/seedance/SeedanceProvider.ts"],"names":[],"mappings":"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"}
apps/server/dist/providers/index.d.ts:3:export { SeedanceProvider } from './seedance/SeedanceProvider';
apps/server/dist/providers/index.d.ts:4:export { KlingProvider } from './kling/KlingProvider';
apps/server/dist/providers/index.d.ts:5:export { VeoProvider } from './veo/VeoProvider';
apps/server/dist/providers/manager/ProviderManager.js:4:const SeedanceProvider_1 = require("../seedance/SeedanceProvider");
apps/server/dist/providers/manager/ProviderManager.js:5:const KlingProvider_1 = require("../kling/KlingProvider");
apps/server/dist/providers/manager/ProviderManager.js:6:const VeoProvider_1 = require("../veo/VeoProvider");
apps/server/dist/providers/manager/ProviderManager.js:16:            this._instance.register(new SeedanceProvider_1.SeedanceProvider({
apps/server/dist/providers/manager/ProviderManager.js:20:            this._instance.register(new KlingProvider_1.KlingProvider({
apps/server/dist/providers/manager/ProviderManager.js:24:            this._instance.register(new VeoProvider_1.VeoProvider({
apps/server/dist/providers/kling/KlingProvider.d.ts.map:1:{"version":3,"file":"KlingProvider.d.ts","sourceRoot":"","sources":["../../../src/providers/kling/KlingProvider.ts"],"names":[],"mappings":"AACA,OAAO,EACL,cAAc,EAAE,YAAY,EAAE,cAAc,EAC5C,eAAe,EAAE,gBAAgB,EAAE,UAAU,EAAE,cAAc,EAC9D,MAAM,8BAA8B,CAAC;AAEtC,qBAAa,aAAc,YAAW,cAAc;IAClD,QAAQ,CAAC,IAAI,EAAE,YAAY,CAAW;IACtC,QAAQ,CAAC,MAAM,EAAE,QAAQ,CAAC,cAAc,CAAC,CAAC;IAE1C,OAAO,CAAC,OAAO,CAA0D;gBAE7D,SAAS,CAAC,EAAE,OAAO,CAAC,cAAc,CAAC;IAWzC,UAAU,CAAC,KAAK,EAAE,eAAe,GAAG,OAAO,CAAC,gBAAgB,CAAC;IAQ7D,SAAS,CAAC,cAAc,EAAE,MAAM,GAAG,OAAO,CAAC,UAAU,CAAC;IAqBtD,cAAc,CAAC,QAAQ,EAAE,MAAM,EAAE,UAAU,EAAE,MAAM,GAAG,OAAO,CAAC,cAAc,CAAC;IAMnF,OAAO,CAAC,MAAM;CACf"}
apps/server/dist/providers/kling/KlingProvider.d.ts:2:export declare class KlingProvider implements IVideoProvider {
apps/server/dist/providers/kling/KlingProvider.d.ts:12://# sourceMappingURL=KlingProvider.d.ts.map
apps/server/dist/providers/kling/KlingProvider.js:3:exports.KlingProvider = void 0;
apps/server/dist/providers/kling/KlingProvider.js:5:class KlingProvider {
apps/server/dist/providers/kling/KlingProvider.js:20:        // Real: POST to Kling API
apps/server/dist/providers/kling/KlingProvider.js:41:            return { externalTaskId, status: 'failed', progress, videoUrl: '', thumbnailUrl: '', duration: 0, error: 'Kling: API timeout', metadata: {} };
apps/server/dist/providers/kling/KlingProvider.js:52:exports.KlingProvider = KlingProvider;
apps/server/dist/providers/kling/KlingProvider.js:53://# sourceMappingURL=KlingProvider.js.map
apps/server/dist/providers/kling/KlingProvider.js.map:1:{"version":3,"file":"KlingProvider.js","sourceRoot":"","sources":["../../../src/providers/kling/KlingProvider.ts"],"names":[],"mappings":"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"}
apps/server/dist/providers/index.js:3:exports.VeoProvider = exports.KlingProvider = exports.SeedanceProvider = exports.ProviderManager = void 0;
apps/server/dist/providers/index.js:6:var SeedanceProvider_1 = require("./seedance/SeedanceProvider");
apps/server/dist/providers/index.js:7:Object.defineProperty(exports, "SeedanceProvider", { enumerable: true, get: function () { return SeedanceProvider_1.SeedanceProvider; } });
apps/server/dist/providers/index.js:8:var KlingProvider_1 = require("./kling/KlingProvider");
apps/server/dist/providers/index.js:9:Object.defineProperty(exports, "KlingProvider", { enumerable: true, get: function () { return KlingProvider_1.KlingProvider; } });
apps/server/dist/providers/index.js:10:var VeoProvider_1 = require("./veo/VeoProvider");
apps/server/dist/providers/index.js:11:Object.defineProperty(exports, "VeoProvider", { enumerable: true, get: function () { return VeoProvider_1.VeoProvider; } });

[exit_code=0]

```
Provider ?????
- apps/server/src/providers/index.ts
- apps/server/src/providers/interfaces/IVideoProvider.ts
- apps/server/src/providers/kling/KlingProvider.ts
- apps/server/src/providers/manager/ProviderManager.ts
- apps/server/src/providers/seedance/SeedanceProvider.ts
- apps/server/src/providers/veo/VeoProvider.ts

???????Seedance?Kling?Veo?OpenAI ?????????DeepSeek/Gemini ????? Provider?

## 11. Agent ????

| ?? | ?? | ?? |
|---|---|---|
| ???? | ? ??? | products routes/pages |
| ???? | ? ??? | assets / asset-library |
| ???? | ? ??? | research / knowledge / analyzer |
| AI???? | ? ??? | scripts / prompt engine |
| ???? | ? ??? | video-generator / providers |
| TikTok?? | ?? ???? | publish/publishing/tiktok connector???????? |
| ????? | ? ??? | automation routes/pages |
| ?????? | ? ??? | localization routes/pages |

## 12. ?????

```mermaid
flowchart LR
  User[Browser/User] --> Nginx[Nginx :80/:443]
  Nginx --> Web[Next.js Web :3000]
  Nginx --> API[Express API :4000]
  Web --> API
  API --> DB[(PostgreSQL)]
  API --> Redis[(Redis)]
  API --> Providers[AI Providers: Seedance/Kling/Veo/OpenAI]
  API --> Files[uploads/output files]
```
```text
$ find . -maxdepth 3 -type d -not -path './.git*' -not -path './node_modules*' -not -path './apps/web/.next*' | sort | sed -n '1,220p'
.
./apps
./apps/server
./apps/server/dist
./apps/server/prisma
./apps/server/src
./apps/web
./apps/web/public
./apps/web/src
./nginx
./nginx/logs
./packages
./packages/shared
./packages/shared/dist
./packages/shared/src
./uploads
./uploads/asset_library
./uploads/asset_library/brand_logo
./uploads/asset_library/broll
./uploads/asset_library/competitor_video
./uploads/asset_library/product_image
./uploads/asset_library/product_video
./uploads/asset_library/ugc_talking
./uploads/assets
./uploads/campaigns
./uploads/products
./uploads/video-generator

[exit_code=0]

```

## 13. ????

### 1. ??????

- Docker ?????`5/5`
- API?`200`
- Web?`200`
- Redis ping exit?`0`
- Prisma generate exit?`0`
- ?? build exit?`0`
- ?? build exit?`0`

### 2. ???

- Git ????????????????????????????
- SEEDANCE_API_KEY ???????????????? mock/?????
- OPENAI_API_KEY ????? OpenAI ???????????
- ???????????

### 3. ????

- DeepSeek/Gemini ????? Provider ???
- ?? TikTok ????????????
- Seedance/OpenAI ???????? API Key?

### 4. ????????

- ?????????????
- ?? SEEDANCE_API_KEY?OPENAI_API_KEY ?????????
- ?? CI/CD ?????
- ?? Postgres volume ? uploads ?????

### 5. ??????

1. P0???????? GitHub?
2. P0????? AI API Key?
3. P1???????????????
4. P1??? TikTok ?????
5. P2??? DeepSeek/Gemini Provider?

### 6. ???????

- ????
- ????
- ??/??/???????
- ???/????????
- ????/???????
- ?????????
- ??????????

### 7. ??????

- ?? Seedance ?????? API Key?
- ?? OpenAI ??/Whisper?? API Key?
- ?? TikTok ??????/???

### 8. ????

- ??????????
- ?? .env ????????? server?
- ?? docker-compose ? obsolete version ???
- ? realAnalyzer ??????????/Linux ??????

### ????

?????????????????????
