# API Document

Base URL: http://localhost:4002/api in local dev, http://localhost/api behind nginx.

## Health

GET /health

Returns service status.

## Products

- GET /products
- POST /products
- GET /products/:id
- PUT /products/:id
- DELETE /products/:id

## Scripts

- GET /scripts
- POST /scripts/generate
- POST /scripts/:id/regenerate

## Storyboards

- GET /storyboards
- POST /storyboards/generate
- PUT /storyboards/:id

## Prompts

- GET /prompts
- POST /prompts/generate
- POST /prompts/generate-bulk

## Video Tasks / Providers

- GET /video-tasks
- POST /video-tasks/create
- POST /providers/:provider/create
- POST /providers/submit-batch
- GET /providers/:provider/tasks

Supported providers found:

- seedance
- kling
- eo

## Other Modules

- /assets
- /asset-library
- /research
- /campaigns
- /campaigns-v2
- /post-production
- /publishing
- /performance
- /knowledge
- /automation
- /agent
- /data-center
"@
'DELIVERY_CHECKLIST.md' = @"
# Delivery Checklist

## Completed

- [x] Migrated full project to D:\CCTK视频\tiktok-ai-factory.
- [x] Restored .git repository.
- [x] Normalized branch name to main.
- [x] Added GitHub origin remote.
- [x] Installed npm dependencies.
- [x] Fixed TypeScript build blockers.
- [x] Fixed video task metadata serialization issue.
- [x] Added production health checks.
- [x] Created root .env defaults.
- [x] Verified 
pm run build success.
- [x] Verified local frontend HTTP 200.
- [x] Verified local backend health HTTP 200.
- [x] Installed Docker Desktop.
- [x] Added Docker CLI path to user PATH.
- [x] Generated delivery documents.

## Blocked

- [ ] Docker containers cannot start until WSL2 is enabled with administrator rights and Windows is restarted.
- [ ] Real Seedance/OpenAI production generation requires API keys.

## Before Client Production

- [ ] Configure real secrets.
- [ ] Enable WSL2 and start Docker production stack.
- [ ] Run end-to-end real video generation.
- [ ] Implement/verify auth, tenant isolation, quota, payment, and admin RBAC.
